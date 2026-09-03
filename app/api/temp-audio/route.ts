export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUDIO: Record<string, string> = {
  patient:
    'https://resource2.heygen.ai/text_to_speech/10bb3ef56d634e949fc9e84c0d2bf81d/46daee8d4d0042b184a6ce903014ac18/id=6dd8b11f-2be5-4f91-abdb-ea01d39c75d3.wav',
  doctor:
    'https://resource2.heygen.ai/text_to_speech/10bb3ef56d634e949fc9e84c0d2bf81d/b61e9d5acad544c8a0cb791d3c9decf9/id=abd3808b-421e-41ed-86b7-d3cb91e0d81b.wav',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clip = searchParams.get('clip') || '';
  const source = AUDIO[clip];
  if (!source) {
    return Response.json({ error: 'invalid clip' }, { status: 400 });
  }

  const upstream = await fetch(source, { cache: 'no-store' });
  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: 'upstream audio unavailable', status: upstream.status },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'audio/wav',
      'Cache-Control': 'no-store, max-age=0',
      'Content-Disposition': `inline; filename="samascan-${clip}.wav"`,
    },
  });
}
