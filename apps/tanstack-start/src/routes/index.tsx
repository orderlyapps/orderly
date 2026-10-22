import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Group,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();

  return (
    <main>
      <Stack gap="md">
        <Group gap="sm">
          <Title order={1}>Welcome to TanStack Start</Title>
          <Badge variant="light" size="lg">
            Mantine
          </Badge>
        </Group>
        <Text>
          Edit <code>src/routes/index.tsx</code> to get started.
        </Text>
        <Group>
          <Button component={Link} to="/posts">
            Get started
          </Button>
          <Button variant="default" onClick={toggleColorScheme}>
            Switch to {computedColorScheme === "dark" ? "light" : "dark"} mode
          </Button>
        </Group>
      </Stack>
    </main>
  );
}
