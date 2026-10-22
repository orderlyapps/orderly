import { Link, createFileRoute } from "@tanstack/react-router";
import { Button, Code, Stack, Text, Title } from "@mantine/core";

export const Route = createFileRoute("/posts/$postId")({ component: Post });

function Post() {
  const { postId } = Route.useParams();

  return (
    <main>
      <Stack gap="md">
        <Title order={1}>Post {postId}</Title>
        <Text>
          This page lives at <Code>/posts/{postId}</Code> — a dynamic route segment read with{" "}
          <code>Route.useParams()</code>.
        </Text>
        <Button component={Link} to="/posts" w="fit-content">
          Back to posts
        </Button>
      </Stack>
    </main>
  );
}
