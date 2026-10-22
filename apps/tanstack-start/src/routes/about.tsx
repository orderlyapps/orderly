import { Link, createFileRoute } from "@tanstack/react-router";
import { Button, Stack, Text, Title } from "@mantine/core";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <main>
      <Stack gap="md">
        <Title order={1}>About</Title>
        <Text>
          This page was rendered by navigating client-side with TanStack Router. The nav bar above
          uses <code>Link</code> with <code>activeProps</code> to highlight the current page.
        </Text>
        <Button component={Link} to="/" w="fit-content">
          Back home
        </Button>
      </Stack>
    </main>
  );
}
