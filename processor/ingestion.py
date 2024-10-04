import os
import sys
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import BSHTMLLoader
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone as PineconeClient, ServerlessSpec

from consts import INDEX_NAME

load_dotenv()

def load_html_files(directory):
    documents = []
    for filename in os.listdir(directory):
        if filename.endswith(".html"):
            filepath = os.path.join(directory, filename)
            loader = BSHTMLLoader(filepath)
            documents.extend(loader.load())
    return documents

def ingest_docs(doc_type: str) -> None:
    # Initialize Pinecone client
    pc = PineconeClient(api_key=os.environ["PINECONE_API_KEY"], environment=os.environ["PINECONE_ENVIRONMENT"])

    # Ensure the index exists
    if INDEX_NAME not in pc.list_indexes():
        pc.create_index(
            name=INDEX_NAME,
            dimension=1536,
            metric='euclidean',
            spec=ServerlessSpec(
                cloud='gcp',
                region='us-central1'
            )
        )

    pinecone_index = pc.Index(INDEX_NAME)

    # Determine the source path based on the doc_type argument
    if doc_type == "Nextjs":
        source_path = "next-docs-raw-data/"
    elif doc_type == "React":
        source_path = "react-docs-raw-data/"
    elif doc_type == "Express":
        source_path = "express-docs-raw-data/"
    else:
        raise ValueError(f"Unsupported doc_type: {doc_type}")

    # Load raw documents
    raw_documents = load_html_files(source_path)
    print(f"Loaded {len(raw_documents)} documents from {source_path}")

    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100, separators=["\n\n", "\n", " ", ""])
    documents = text_splitter.split_documents(documents=raw_documents)
    print(f"Split {len(documents)} documents into chunks")

    # Update document metadata
    for doc in documents:
        old_path = doc.metadata["source"]
        new_url = old_path.replace(source_path, "https://")
        doc.metadata.update({"source": new_url, "type": doc_type})

    # Embed and upload documents to Pinecone
    embeddings = OpenAIEmbeddings()
    vector_store = PineconeVectorStore.from_documents(
        docs=documents,
        index_name=INDEX_NAME,
        embedding=embeddings
    )
    print(f"Uploaded {len(documents)} documents to Pinecone")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python ingestion.py <doc_type>")
        sys.exit(1)

    doc_type = sys.argv[1]
    ingest_docs(doc_type)
