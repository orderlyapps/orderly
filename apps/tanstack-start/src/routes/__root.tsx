import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router";
import { Anchor, ColorSchemeScript, Group, MantineProvider, mantineHtmlProps } from "@mantine/core";

import mantineCss from "@mantine/core/styles.css?url";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: mantineCss,
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  headers: () => ({
    "X-Robots-Tag": "noindex, nofollow",
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <HeadContent />
      </head>
      <body>
        <MantineProvider>
          <Group
            component="nav"
            gap="lg"
            px="md"
            py="sm"
            style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
          >
            <Anchor
              component={Link}
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ style: { fontWeight: 700 } }}
            >
              Home
            </Anchor>
            <Anchor component={Link} to="/about" activeProps={{ style: { fontWeight: 700 } }}>
              About
            </Anchor>
            <Anchor component={Link} to="/posts" activeProps={{ style: { fontWeight: 700 } }}>
              Posts
            </Anchor>
            <Anchor component={Link} to="/calculator" activeProps={{ style: { fontWeight: 700 } }}>
              Calculator
            </Anchor>
          </Group>
          {children}
        </MantineProvider>

        <Scripts />
      </body>
    </html>
  );
}
