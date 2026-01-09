import { Metadata } from "next";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/landing";
const API_KEY = process.env.NEXT_PUBLIC_LANDING_API_KEY || "";

interface ExperienceData {
  experience: {
    id: string;
    author: { name: string };
    restaurant: { name: string; place?: string };
    ratings: { overall: number };
    description: string;
    images: Array<{ url: string }>;
    publishedAt: string;
  };
}

async function getExperienceData(id: string): Promise<ExperienceData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/experiences/${id}`, {
      headers: {
        "y-api-key": API_KEY,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getExperienceData(id);

  if (!data) {
    return {
      title: "Experience Not Found | Dinver",
      description: "This experience is no longer available.",
    };
  }

  const { experience } = data;
  const title = `${experience.author.name} @ ${experience.restaurant.name} | Dinver`;
  const description = experience.description
    ? experience.description.length > 160
      ? experience.description.substring(0, 157) + "..."
      : experience.description
    : `${experience.ratings.overall.toFixed(1)} rating at ${experience.restaurant.name}${experience.restaurant.place ? `, ${experience.restaurant.place}` : ""}`;

  const ogImage = experience.images[0]?.url || "https://dinver.app/og-image.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://dinver.app/experience/${id}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${experience.author.name}'s experience at ${experience.restaurant.name}`,
        },
      ],
      siteName: "Dinver",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: "@dinver_app",
    },
    alternates: {
      canonical: `https://dinver.app/experience/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function ExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
