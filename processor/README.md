---
title: Langchain Docs
emoji: 👁
colorFrom: green
colorTo: red
sdk: streamlit
sdk_version: 1.26.0
app_file: app.py
pinned: false
---

This app is available at huggingface spaces [here.](https://huggingface.co/spaces/Petermoyano/langchain-docs)

## 1 Envirnoment Setup
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