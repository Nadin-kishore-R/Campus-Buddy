#!/bin/bash
# init_ollama.sh - Pulls the required model in Ollama container

CONTAINER_NAME="campus_assistant_ollama"
MODEL_NAME=${OLLAMA_MODEL:-"qwen3.5:4b"}

echo "Waiting for Ollama container to be ready..."
sleep 5

echo "Pulling model $MODEL_NAME..."
docker exec $CONTAINER_NAME ollama pull $MODEL_NAME

echo "Model $MODEL_NAME is ready."
