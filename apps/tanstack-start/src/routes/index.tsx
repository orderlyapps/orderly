import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
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
          <SegmentedControl
            value={colorScheme}
            onChange={(value) => setColorScheme(value as "light" | "dark" | "auto")}
            data={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: `System (${computedColorScheme})`, value: "auto" },
            ]}
          />
        </Group>
      </Stack>
    </main>
  );
}
