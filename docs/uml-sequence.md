# CityPaper — UML Sequence Diagram

```
Client          Express         Guardrail       Orchestrator
  |                |                |                |
  |  POST /agent   |                |                |
  |--------------->|                |                |
  |                | validateInput()|                |
  |                |--------------->|                |
  |                |    {valid:true}|                |
  |                |<---------------|                |
  |                |                | runOrchestrator|
  |                |--------------------------------->|
  |                |                |                |
  |                |                |      WeatherAgent    OpenWeatherMap
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |                |      NewsAgent       NewsAPI
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |                |      CityInfoAgent   Wikipedia
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |                |      EditorAgent     Ollama
  |                |                |                |--------->|
  |                |                |                |<---------|
  |                |   Newspaper{}  |                |
  |<---------------|                |                |
```

This sequence diagram illustrates the flow of a newspaper generation request:

1. **Client Request**: The client sends a POST request to `/agent` with city information.
2. **Input Validation**: Express passes the request to the Input Guardrail for validation (regex patterns and coordinate bounds).
3. **Orchestrator Invocation**: Upon validation success, the Orchestrator Agent is invoked.
4. **Parallel Agent Execution**: The Orchestrator coordinates four sub-agents:
   - **WeatherAgent** fetches current weather from OpenWeatherMap API
   - **NewsAgent** retrieves recent news from NewsAPI.org
   - **CityInfoAgent** gathers city information from Wikipedia
   - **EditorAgent** uses Ollama LLM to compose the newspaper story and editorial note
5. **Response**: The Orchestrator aggregates results into a complete `Newspaper` JSON object and returns it to the client.

Each agent operates independently with its own external API calls, enabling efficient parallel processing of the newspaper generation request.
