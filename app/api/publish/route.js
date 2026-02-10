import { NextResponse } from 'next/server';

const REPO_OWNER = 'vega-create';
const REPO_NAME = 'vega-note';
const POSTS_PATH = 'src/content/posts';

export async function POST(request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });
  }

  // Simple auth check
  const authHeader = request.headers.get('x-writer-key');
  if (authHeader !== process.env.WRITER_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { filename, content, message } = await request.json();
    
    if (!filename || !content) {
      return NextResponse.json({ error: 'Missing filename or content' }, { status: 400 });
    }

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_PATH}/${filename}`;

    // Check if file exists (for update)
    let sha = undefined;
    try {
      const check = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (check.ok) {
        const data = await check.json();
        sha = data.sha;
      }
    } catch {}

    // Create or update file
    const body = {
      message: message || `新增文章: ${filename}`,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch: 'main',
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json({
      success: true,
      path: result.content?.path,
      url: `https://vega-note.com/posts/${filename.replace('.md', '')}/`,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
