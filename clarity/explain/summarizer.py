import os
import json
from groq import Groq

def generate_summary(stack_data: dict, structure_data: dict, pipeline_data: dict) -> str:
    """
    Sends structured data to Groq API to generate a plain-English explanation.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Explanation unavailable: GROQ_API_KEY not set. Please get a free API key from https://console.groq.com/"
        
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are a senior software architect explaining a repository to a junior developer or a non-technical stakeholder.
    Based on the following structured data extracted from the repository, provide a detailed, multi-paragraph explanation of what this project does and how it works.
    
    Requirements:
    1. Write in simple, easy-to-understand words. Avoid overly dense technical jargon where possible.
    2. Use standard Markdown formatting. Include clear headings (e.g. ### Purpose, ### Architecture, ### Core Features).
    3. Use bullet points heavily for readability, breaking down complex information into concise, readable lists.
    4. Keep it engaging, clear, and perfectly formatted for a frontend Markdown renderer.
    
    Stack:
    {json.dumps(stack_data, indent=2)}
    
    Structure:
    {json.dumps(structure_data, indent=2)}
    
    Pipeline:
    {json.dumps(pipeline_data, indent=2)}
    """
    
    try:
        chat_completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{"role": "user", "content": prompt}],
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        error_msg = str(e)
        if "503" in error_msg:
            return "Explanation temporarily unavailable: The AI model is currently experiencing high demand (503). However, you can explore the architecture diagram below."
        return f"Explanation unavailable due to API error: {error_msg}"


def answer_question(context_data: dict, question: str, history: list = None) -> str:
    """
    Answers a specific user question about the repository based on the cached context and chat history.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "Chat unavailable: GROQ_API_KEY not set. Please get a free API key from https://console.groq.com/"
        
    client = Groq(api_key=api_key)
    
    prompt = f"""
    You are Clarity AI, a friendly, helpful, and highly intelligent AI software architecture assistant (similar in tone and behavior to ChatGPT).
    A user is asking a question about their repository metadata.
    
    CRITICAL RULES:
    1. Be conversational, polite, and exceptionally helpful, adopting a natural ChatGPT-like conversational tone.
    2. Provide answers that are colorful, engaging, and rich in detail, yet moderate in length. Use rich Markdown formatting (bolding, headers, lists, code blocks, blockquotes) to make your response visually appealing and easy to read.
    3. If the user asks a follow-up question, answer ONLY the follow-up contextually. Do not restate the entire project structure unless necessary.
    4. NEVER mention internal temporary absolute file paths (like C:\\Users\\...\\Temp\\clarity_repo_xyz). When referencing paths, ALWAYS use the relative repository paths (like /src, /client, /server).
    
    Repository Context (Tech Stack, Folder Structure, and Call Graph):
    {json.dumps(context_data, indent=2)}
    """
    
    messages = [{"role": "system", "content": prompt}]
    
    if history:
        # Append up to the last 10 messages for context
        for msg in history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": question})
    
    try:
        chat_completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=messages,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        return f"Sorry, I encountered an error answering that: {str(e)}"
