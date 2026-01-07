// Blog API Client

const BLOG_API_URL = 'https://api.dinver.eu/api/app';

// ==================== TYPES ====================

export interface BlogAuthor {
  name: string;
  profileImage?: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  category: string | null;
  tags: string[];
  publishedAt: string;
  readingTimeMinutes: number;
  viewCount: number;
  likesCount: number;
  dislikesCount: number;
  author: BlogAuthor;
}

export interface BlogPostDetail extends BlogPost {
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  userReaction: 'like' | 'dislike' | null;
}

export interface BlogsResponse {
  blogs: BlogPost[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export interface BlogReactionResponse {
  likesCount: number;
  dislikesCount: number;
  userReaction: 'like' | 'dislike' | null;
}

// ==================== SESSION HELPER ====================

export function getBlogSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem('dinver-blog-session-id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('dinver-blog-session-id', sessionId);
  }
  return sessionId;
}

// ==================== API FUNCTIONS ====================

export async function getBlogs(params?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  language?: 'hr-HR' | 'en-US';
}): Promise<BlogsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.category) searchParams.set('category', params.category);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.language) searchParams.set('language', params.language);

  const query = searchParams.toString();
  const url = `${BLOG_API_URL}/public/blogs${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch blogs: ${response.status}`);
  }

  return response.json();
}

export async function getBlogBySlug(
  slug: string,
  sessionId?: string
): Promise<BlogPostDetail> {
  const url = `${BLOG_API_URL}/public/blogs/${slug}`;

  const headers: HeadersInit = {};
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }

  const response = await fetch(url, {
    headers,
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Blog not found');
    }
    throw new Error(`Failed to fetch blog: ${response.status}`);
  }

  return response.json();
}

export async function trackBlogView(slug: string): Promise<{ viewCount: number }> {
  const url = `${BLOG_API_URL}/public/blogs/${slug}/view`;

  const response = await fetch(url, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to track view: ${response.status}`);
  }

  return response.json();
}

export async function reactToBlog(
  slug: string,
  reaction: 'like' | 'dislike' | null,
  sessionId: string
): Promise<BlogReactionResponse> {
  const url = `${BLOG_API_URL}/public/blogs/${slug}/react`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ reaction }),
  });

  if (!response.ok) {
    throw new Error(`Failed to react: ${response.status}`);
  }

  return response.json();
}

// ==================== UTILITIES ====================

export function formatDate(dateString: string, locale: 'hr' | 'en' = 'hr'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'hr' ? 'hr-HR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatReadingTime(minutes: number, locale: 'hr' | 'en' = 'hr'): string {
  if (locale === 'hr') {
    return `${minutes} min čitanja`;
  }
  return `${minutes} min read`;
}
