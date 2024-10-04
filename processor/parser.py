import os
import json
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def clean_and_save_docs(framework):
    input_folder = f"/home/peter/chatbots/langchain-docs-chatbot/processor/{framework}-docs-raw-data"
    output_folder = f"/home/peter/chatbots/langchain-docs-chatbot/processor/cleaned-docs/{framework}-cleaned-docs"
    os.makedirs(output_folder, exist_ok=True)

    metadata = []

    for filename in os.listdir(input_folder):
        if filename.endswith(".html"):
            input_path = os.path.join(input_folder, filename)
            output_path = os.path.join(output_folder, f"{os.path.splitext(filename)[0]}.txt")

            with open(input_path, "r", encoding="utf-8") as file:
                html_content = file.read()

            soup = BeautifulSoup(html_content, "html.parser")
            text = soup.get_text()

            with open(output_path, "w", encoding="utf-8") as text_file:
                text_file.write(text)

            # Extract metadata
            url = urlparse(filename.replace("_", "/").replace(".html", ""))
            doc_metadata = {
                "framework": framework,
                "filename": filename,
                "url": url.geturl(),
                "path": url.path,
                "cleaned_file": output_path
            }
            metadata.append(doc_metadata)

    # Save metadata to a JSON file
    with open(os.path.join(output_folder, f"{framework}_metadata.json"), "w", encoding="utf-8") as meta_file:
        json.dump(metadata, meta_file, indent=2)

# Usage
framework = "nextjs"
clean_and_save_docs(framework)
