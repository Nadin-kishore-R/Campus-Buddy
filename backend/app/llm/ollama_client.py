from openai import AsyncOpenAI
from app.config import settings
from typing import List, Dict, Any

class OllamaClient:
    def __init__(self):
        self.base_url = settings.effective_llm_base_url
        self.model_name = settings.effective_model_name
        self.api_key = settings.effective_api_key
        print(f"[OllamaClient] Initializing with base URL: {self.base_url}, default model: {self.model_name}")
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, timeout=180.0)
        self._resolved_model = None

    async def _get_active_model(self) -> str:
        if self._resolved_model:
            return self._resolved_model

        target = self.model_name
        try:
            models_list = await self.client.models.list()
            available = [m.id for m in models_list.data]
            print(f"[OllamaClient] Available models in Ollama: {available}")
            
            if not available:
                return target

            # 1. Exact match
            if target in available:
                self._resolved_model = target
                return self._resolved_model

            # 2. Match without tag / partial tag match
            target_base = target.split(":")[0].lower()
            for m in available:
                m_lower = m.lower()
                if target_base in m_lower or m_lower.split(":")[0] in target_base:
                    self._resolved_model = m
                    print(f"[OllamaClient] Matched model '{target}' to available model '{m}'")
                    return self._resolved_model

            # 3. Match any 3.5 / 4b / 3b / qwen / phi in the name
            for keyword in ["3.5", "4b", "3b", "qwen", "phi", "llama"]:
                if keyword in target.lower():
                    for m in available:
                        if keyword in m.lower():
                            self._resolved_model = m
                            print(f"[OllamaClient] Matched keyword '{keyword}' in '{target}' to '{m}'")
                            return self._resolved_model

            # 4. Fallback to first model currently available in Ollama
            self._resolved_model = available[0]
            print(f"[OllamaClient] Model '{target}' not exact match; automatically using pulled model '{self._resolved_model}'")
            return self._resolved_model

        except Exception as e:
            print(f"[OllamaClient Warning] Could not list models from Ollama ({e}). Using '{target}' directly.")
            return target

    async def generate_chat_completion(self, messages: List[Dict[str, str]], max_tokens: int = 1024, temperature: float = 0.2, model_override: str = None) -> str:
        model_to_use = model_override or await self._get_active_model()
        try:
            response = await self.client.chat.completions.create(
                messages=messages,
                model=model_to_use,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"[OllamaClient Error] Failed to generate response with model '{model_to_use}': {e}")
            self._resolved_model = None
            return "I apologize, but I am unable to connect to the LLM service at this moment."

    async def generate_chat_stream(self, messages: List[Dict[str, str]], max_tokens: int = 1024, temperature: float = 0.2, model_override: str = None):
        model_to_use = model_override or await self._get_active_model()
        try:
            stream = await self.client.chat.completions.create(
                messages=messages,
                model=model_to_use,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            print(f"[OllamaClient Error] Failed to generate stream with model '{model_to_use}': {e}")
            self._resolved_model = None
            yield "I apologize, but I am unable to connect to the LLM service at this moment."

ollama_client = OllamaClient()

