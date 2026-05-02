const OpenAI = require('openai');

function getProvider() {
  const provider = process.env.LLM_PROVIDER || 'groq';

  if (provider === 'ollama') {
    const client = new OpenAI({
      apiKey: 'ollama',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434/v1',
    });
    return {
      client,
      model: process.env.OLLAMA_MODEL || 'llama3',
      provider: 'ollama',
    };
  }

  // Default: Groq
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  return {
    client,
    model: process.env.GROQ_MODEL || 'llama3-70b-8192',
    provider: 'groq',
  };
}

module.exports = { getProvider };
