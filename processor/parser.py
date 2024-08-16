from bs4 import BeautifulSoup

# Load your HTML file
with open("/home/peter/chatbots/langchain-docs-chatbot/processor/react-docs-raw-data/https:_react.dev_blog_2020_12_21_data-fetching-with-react-server-components.html", "r", encoding="utf-8") as file:
    html_content = file.read()

# Parse the HTML
soup = BeautifulSoup(html_content, "html.parser")

# Extract the text
text = soup.get_text()

# Save the text to a new file
with open("output.txt", "w", encoding="utf-8") as text_file:
    text_file.write(text)
