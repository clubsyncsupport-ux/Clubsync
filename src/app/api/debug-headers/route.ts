export async function GET(request: Request) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return Response.json({ url: request.url, headers });
}
