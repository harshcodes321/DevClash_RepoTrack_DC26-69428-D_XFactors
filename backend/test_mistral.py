import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("MISTRAL_API_KEY", "")

async def main():
    if not api_key:
        print("NO MISTRAL API KEY IN ENV")
        return
    try:
        from mistralai.client import Mistral
        client = Mistral(api_key=api_key)
        resp = await client.chat.complete_async(
            model="mistral-small-latest",
            messages=[
                {"role": "user", "content": "say hi"}
            ],
            max_tokens=10
        )
        print("Mistral Success:", resp.choices[0].message.content)
    except Exception as e:
        print("Mistral Error:", e)

asyncio.run(main())
