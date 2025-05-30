import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate(request);
    
    if (!session) {
      const url = new URL(request.url);
      const searchParams = new URLSearchParams();
      searchParams.set("shop", url.searchParams.get("shop") || "");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/auth/login?${searchParams.toString()}`,
        },
      });
    }

    return json({ 
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shop: session.shop
    });
  } catch (error) {
    console.error("Authentication error:", error);
    const url = new URL(request.url);
    const searchParams = new URLSearchParams();
    searchParams.set("shop", url.searchParams.get("shop") || "");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/auth/login?${searchParams.toString()}`,
      },
    });
  }
};

export default function App() {
  const { apiKey, shop } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/additional">Additional page</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
