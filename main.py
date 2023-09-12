from backend.core import run_llm
import streamlit as st
from streamlit_chat import message
from typing import Set

st.header("Peter's LangChain chatbot")
prompt = st.text_input("Ask me anything about LangChain", placeholder="...")

# Initialize session state variables if they don't exist yet.
if "user_prompt_history" not in st.session_state:
    st.session_state.user_prompt_history = []

if "chat_answers_history" not in st.session_state:
    st.session_state.chat_answers_history = []


# Format sources links (referencing LangChain urls) as a clean enumerated list.
def create_sources_string(source_urls: Set[str]) -> str:
    if not source_urls:
        return ""
    sources_list = list(source_urls)
    sources_list.sort()
    sources_string = "sources:\n"
    for i, source in enumerate(sources_list):
        sources_string += f"{i+1}. {source}\n"
    return sources_string


if prompt:
    with st.spinner("Thinking..."):
        generated_response = run_llm(query=prompt)
        sources = set(
            [doc.metadata["source"]
                for doc in generated_response["source_documents"]
             ]
        )
        formatted_response = (
            f"{generated_response['result']}"
        )

        # Add the user's prompt and the chatbot's response to the session state variables.
        st.session_state.user_prompt_history.append(prompt)
        st.session_state.chat_answers_history.append(formatted_response)

if st.session_state.chat_answers_history:
    for generated_response, user_query in zip(
            st.session_state.chat_answers_history, st.session_state.user_prompt_history):
        message(user_query, is_user=True)
        message(generated_response, is_user=False)
