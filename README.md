
This project is meant to be a simple example of how to use R.A.G. with a Pinecone datastore to store and retrieve vectors. It uses the Pinecone API to store vectors of documents (docs HTML files) and then retrieve the most similar documents to a user's query. The vectors are created with the dump, after scraping the documentations sites of the MERN stack.

The scraping part is in the scraper folder, while the rest of the logic is in the processor folder.

This app is available at huggingface spaces [here.](https://huggingface.co/spaces/Petermoyano/langchain-docs)

# Usage of scraper/scrape_docs.js file.
This file is used to scrape the documentation sites of the MERN stack. It uses the puppeteer library to scrape the HTML files of the documentation sites. The HTML files are then stored in the docs folder. The scraper/scrape_docs.js file is a node.js file that can be run with the following command:

```bash
node scraper/scrape_docs.js <url-of-docs-to-scrape>
```



# Personal notes
## Envirnoment Setup
- Create Pinecone Index
- .env
- Vector Size considerations. 1 vector is 768 to 1024 dimensions. Each dimension is a float (4 bytes)
- Imbed docs into vectors, then storing them in Pinecone
## Calculating Pinecone Database Size

Dimensions: 1536
Record Count: 34,516
To calculate the approximate size of your vector store:

Size of One Vector:
Each dimension is typically a 32-bit floating point number (4 bytes).

### Size of one vector
1 vector = 1536 dimensions × 4 bytes = 6144 bytes

Total Size:

Total size=34,516 records×6144 bytes=211,599,744 bytes≈211.6 MB

## Pinecone Index
- Check unique metadata: The metadata for each document chunk should include identifiers that distinguish between different document sources. This prevents any accidental overwriting.

## Possible next improvments
- Focus: Create an agent that removes the un-neccesary HTML syntax from the raw data. This will reduce the size of the vectors and possible? give more accurate results, because the vectors will only containe relevant data.

- EPIC: Make it customizable: Allow the user to enter a INDEX_NAME for a personal datastore, to have the app connect to their own Pinecone index. This would allow the user to use other relevant docs for the chatbot. This would imply that Google authentications is required, and the setting up of a database to store the Pinecone API key. The web-scraping part would be done locally, due to network restrictions. Once that process finishes, everything else would be done on the cloud.

- Add memory.

- Explore the use the metadata to filter the results for enhanced context (Mongo, Next, React, etc):
    prompt = f"""
    You are a knowledgeable assistant. Use the following context to answer the question.

    Context:
    - Source: {doc.metadata['source']}
    - Type: {doc.metadata['type']}

    Question: {user_question}
    """

## Selecting the right tool for codebases
Openai's Codex seems to be worst than GPT4.
Microsoft CodeBert: Supports bidirectional context (it considers both the preceding and succeeding tokens in a sequence).
GraphCodeBert: It uses a graph-based representation of code to capture the structural information of the code.
CuBERT: Designed for Python.

## Sales pitch
It's important to start now because LLMs responses are non-deterministic, which means trile & error is required to get the right answer. This is a time-consuming process. The lessons learned here could be useful for a future ai-laba-like project.