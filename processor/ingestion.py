import os
import sys
import re
import logging
from datetime import datetime
from dotenv import load_dotenv
from tqdm import tqdm
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredMarkdownLoader
from langchain_community.embeddings import OpenAIEmbeddings
from langchain.docstore.document import Document
from pinecone import Pinecone as PineconeClient, ServerlessSpec

from consts import INDEX_NAME

# Initialize logging
logging.basicConfig(
    filename='ingestion.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create a StreamHandler for console output
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
logger.addHandler(console_handler)

load_dotenv()

# Log environment variables
logger.info("Environment variables:")
for var in ["PINECONE_API_KEY", "OPENAI_API_KEY"]:
    value = os.environ.get(var)
    logger.info(f"{var}: {'[SET]' if value else '[NOT SET]'}")

# Error handling for required environment variables
required_env_vars = ["PINECONE_API_KEY", "OPENAI_API_KEY"]
for var in required_env_vars:
    if var not in os.environ:
        logger.error(f"Error: The environment variable '{var}' is not set.")
        sys.exit(1)

SUPPORTED_DOC_TYPES = ["Nextjs", "React", "Express", "ai"]

def load_mdx_files(directory):
    """
    Loads and parses MDX files from the specified directory using UnstructuredMarkdownLoader.

    Args:
        directory (str): Path to the directory containing MDX files.

    Returns:
        List[Document]: A list of Document objects containing the content and metadata of each MDX file.
    """
    documents = []
    for filename in os.listdir(directory):
        if filename.endswith(".mdx"):
            filepath = os.path.join(directory, filename)
            loader = UnstructuredMarkdownLoader(filepath)
            try:
                docs = loader.load()
                for doc in docs:
                    # Add filename to metadata
                    doc.metadata["filename"] = filename
                documents.extend(docs)
            except Exception as e:
                logger.error(f"Error loading {filepath}: {e}")
    return documents

def ingest_docs(doc_type: str) -> None:
    """
    Ingests documents of the specified type into the Pinecone vector store.

    Args:
        doc_type (str): The type of documentation to ingest (e.g., 'ai', 'React').

    Returns:
        None
    """
    if doc_type not in SUPPORTED_DOC_TYPES:
        logger.error(f"Unsupported doc_type: {doc_type}")
        logger.info("Available options are:")
        for option in SUPPORTED_DOC_TYPES:
            logger.info(f"- {option}")
        sys.exit(1)

    # Initialize Pinecone client
    try:
        pc = PineconeClient(
            api_key=os.environ["PINECONE_API_KEY"]
        )
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone client: {e}")
        sys.exit(1)

    # Check if the index exists
    if INDEX_NAME not in pc.list_indexes():
        try:
            logger.info(f"Creating index '{INDEX_NAME}'...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=1536,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )
            logger.info(f"Index '{INDEX_NAME}' created successfully.")
        except Exception as e:
            if "ALREADY_EXISTS" in str(e):
                logger.info(f"Index '{INDEX_NAME}' already exists. Proceeding with ingestion.")
            else:
                logger.error(f"Failed to create Pinecone index: {e}")
                sys.exit(1)
    else:
        logger.info(f"Index '{INDEX_NAME}' already exists. Proceeding with ingestion.")

    pinecone_index = pc.Index(INDEX_NAME)

    # Determine the source path based on the doc_type argument
    source_paths = {
        "Nextjs": "next-docs-raw-data",
        "React": "react-docs-raw-data",
        "Express": "express-docs-raw-data",
        "ai": "sdk.vercel.ai-docs-raw-data"
    }
    
    # Get the directory of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct the full path to the source directory
    source_path = os.path.join(script_dir, source_paths[doc_type])
    
    # Check if the source path exists
    if not os.path.exists(source_path):
        logger.error(f"Error: The source path '{source_path}' does not exist.")
        sys.exit(1)

    # Load raw documents
    raw_documents = load_mdx_files(source_path)
    logger.info(f"Loaded {len(raw_documents)} documents from {source_path}")

    # Initialize text splitter with enhanced settings
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n```", "\n\n", "\n", " ", ""]
    )

    # Split documents into chunks based on their size
    documents = []
    for doc in tqdm(raw_documents, desc="Processing documents"):
        text = doc.page_content
        metadata = doc.metadata

        if not text.strip():
            continue  # Skip empty documents

        if len(text) <= 1000:
            # Treat as a single chunk
            documents.append(Document(page_content=text, metadata=metadata))
        else:
            # Split into chunks
            splits = text_splitter.split_text(text)
            for split in splits:
                documents.append(Document(page_content=split, metadata=metadata))

    logger.info(f"Split {len(documents)} documents into chunks")

    # Update document metadata
    for doc in tqdm(documents, desc="Updating document metadata"):
        filename = doc.metadata.get("filename", "")
        new_url = f"https://{doc_type.lower()}-docs/{filename}"

        # Extract title from metadata or text
        title = doc.metadata.get("category", "")
        if not title:
            title_match = re.search(r'^#\s+(.*)', doc.page_content, re.MULTILINE)
            title = title_match.group(1).strip() if title_match else filename

        # Add timestamp
        timestamp = datetime.utcnow().isoformat()

        doc.metadata.update({
            "source": new_url,
            "type": doc_type,
            "title": title,
            "ingested_at": timestamp,
            "text": doc.page_content
        })

    # Embed and upload documents to Pinecone in batches
    embeddings = OpenAIEmbeddings(model='text-embedding-ada-002', disallowed_special=())
    batch_size = 100

    with tqdm(
        total=len(documents),
        desc="Uploading batches to Pinecone",
        dynamic_ncols=True,
        position=0,
        leave=True
    ) as pbar:
        for i in range(0, len(documents), batch_size):
            batch_docs = documents[i:i + batch_size]
            texts = [doc.page_content for doc in batch_docs]
            metadatas = [doc.metadata for doc in batch_docs]
            try:
                vectors = embeddings.embed_documents(texts)
                ids = [f"{doc_type}_{i}_{j}" for j in range(len(batch_docs))]
                # Prepare data for Pinecone upsert
                upsert_data = list(zip(ids, vectors, metadatas))
                pinecone_index.upsert(
                    vectors=upsert_data,
                    namespace=doc_type.lower()
                )
                pbar.update(len(batch_docs))
            except Exception as e:
                logger.error(f"Failed to upsert batch starting at index {i}: {e}")

    logger.info(f"Uploaded {len(documents)} documents to Pinecone")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        logger.error("Usage: python ingestion.py <doc_type>")
        logger.info("Available doc_type options are:")
        for option in SUPPORTED_DOC_TYPES:
            logger.info(f"- {option}")
        sys.exit(1)

    doc_type = sys.argv[1]
    ingest_docs(doc_type)
