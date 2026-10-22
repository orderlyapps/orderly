import { Link, createFileRoute } from "@tanstack/react-router";
import { Anchor, List, Stack, Text, Title } from "@mantine/core";

export const Route = createFileRoute("/posts/")({ component: Posts });

const POSTS = [
  { id: "1", title: "Getting started with TanStack Start" },
  { id: "2", title: "File-based routing" },
  { id: "3", title: "Type-safe navigation" },
];

function Posts() {
  return (
    <main>
      <Stack gap="md">
        <Title order={1}>Posts</Title>
        <Text>Select a post to navigate to a dynamic route.</Text>
        <List>
          {POSTS.map((post) => (
            <List.Item key={post.id}>
              <Anchor
                renderRoot={(props) => (
                  <Link to="/posts/$postId" params={{ postId: post.id }} {...props} />
                )}
              >
                {post.title}
              </Anchor>
            </List.Item>
          ))}
        </List>
      </Stack>
    </main>
  );
}
