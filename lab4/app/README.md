## Вимоги

1. Встановлена програма Ollama.
2. Сучасний веббраузер
3. Відеокарта з 12GB+ VRAM

## Запуск

### Завантаження моделі

```
ollama pull qwen3:14b
```

### Запуск сервера

```
set OLLAMA_ORIGINS="*"
set OLLAMA_KV_CACHE_TYPE=q8_0
set OLLAMA_NUM_PARALLEL=4
ollama serve
```

### Запуск застосунку

Відкрити index.html у вашому веббраузері