"""
This file es responsible for the ingestion of the data (langchain documentation).
It embedds the data into vectors, and stores it in the pinecone vectorstore.
"""
import os
from langchain.document_loaders import ReadTheDocsLoader


def ingest_docs() -> None:
    # The ReadTheDocsLoader is a class that is in charge of taking the dump of some data
    # fetching process and loading it into the vectorstore.
    loader = ReadTheDocsLoader("langchain-docs-chatbot/langchain-docs")
    raw_documents = loader.load()


if __name__ == '__main__':
    print('Hello world!')
