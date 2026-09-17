import time
from sentence_transformers import SentenceTransformer
from app.config import settings

class EmbeddingService:
    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.model = None
        self._load_model()

    def _load_model(self):
        print(f"[EmbeddingService] Initializing embedding model: {self.model_name}")
        # Try local cache first for fast offline startup
        try:
            self.model = SentenceTransformer(self.model_name, local_files_only=True)
            print(f"[EmbeddingService] Successfully loaded '{self.model_name}' from local cache.")
        except Exception as local_err:
            print(f"[EmbeddingService] Local cache miss for '{self.model_name}' ({local_err}). Attempting download...")
            max_retries = 3
            for attempt in range(1, max_retries + 1):
                try:
                    self.model = SentenceTransformer(self.model_name, local_files_only=False)
                    print(f"[EmbeddingService] Successfully downloaded and loaded '{self.model_name}'.")
                    break
                except Exception as e:
                    print(f"[EmbeddingService Error] Attempt {attempt}/{max_retries} failed to load '{self.model_name}': {e}")
                    if attempt < max_retries:
                        time.sleep(2 * attempt)
                    else:
                        print(f"[EmbeddingService Critical] Failed to load model '{self.model_name}' after {max_retries} attempts.")
                        raise e

        # Determine embedding dimension
        try:
            self.dimension = self.model.get_sentence_embedding_dimension()
        except Exception:
            dummy = self.model.encode("test")
            self.dimension = len(dummy)
        print(f"[EmbeddingService] Model dimension: {self.dimension}")

    def embed_text(self, text: str):
        if self.model is None:
            self._load_model()
        return self.model.encode(text, show_progress_bar=False).tolist()
        
    def embed_texts(self, texts: list):
        if self.model is None:
            self._load_model()
        return self.model.encode(texts, show_progress_bar=False).tolist()

embedding_service = EmbeddingService()

