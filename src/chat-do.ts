import { ChatAgent } from "./agent";

export class Chat {
  state: DurableObjectState;
  env: any;
  agent: ChatAgent;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.agent = new ChatAgent(state, env);
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/chat" && req.method === "POST") {
      const body = await req.json();
      return Response.json(await this.agent.respond(body.message));
    }

    if (url.pathname === "/analyze" && req.method === "POST") {
      const body = await req.json();
      return Response.json(await this.agent.analyzeWebsite(body.url));
    }

    return new Response("Not found", { status: 404 });
  }
}
