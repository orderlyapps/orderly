import { createFileRoute } from "@tanstack/react-router";
import { Button, Grid, Paper, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

export const Route = createFileRoute("/calculator")({ component: CalculatorPage });

type Operator = "+" | "-" | "*" | "/";

function calculate(left: number, right: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? Number.NaN : left / right;
  }
}

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  return String(Number(value.toPrecision(12)));
}

interface Key {
  label: string;
  onClick: () => void;
  span?: number;
  variant?: string;
  color?: string;
}

function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (display === "Error" || waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else if (display === "0") {
      setDisplay(digit);
    } else if (display === "-0") {
      setDisplay("-" + digit);
    } else {
      setDisplay(display + digit);
    }
  };

  const inputDot = () => {
    if (display === "Error" || waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const toggleSign = () => {
    if (display === "Error" || display === "0") return;
    if (waitingForOperand && pendingOperator !== null) {
      setDisplay("-0");
      setWaitingForOperand(false);
      return;
    }
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
  };

  const clear = () => {
    setDisplay("0");
    setAccumulator(null);
    setPendingOperator(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display === "Error" || waitingForOperand) return;
    const next = display.slice(0, -1);
    setDisplay(next === "" || next === "-" ? "0" : next);
  };

  const applyOperator = (nextOperator: Operator | null) => {
    if (display === "Error") {
      clear();
      return;
    }
    const inputValue = Number.parseFloat(display);
    if (accumulator !== null && pendingOperator !== null && !waitingForOperand) {
      const result = calculate(accumulator, inputValue, pendingOperator);
      setAccumulator(result);
      setDisplay(formatResult(result));
    } else {
      setAccumulator(inputValue);
    }
    setPendingOperator(nextOperator);
    setWaitingForOperand(true);
  };

  const keys: Key[] = [
    { label: "C", onClick: clear, color: "red" },
    { label: "⌫", onClick: backspace, variant: "light" },
    { label: "±", onClick: toggleSign, variant: "light" },
    { label: "÷", onClick: () => applyOperator("/"), variant: "light", color: "blue" },
    { label: "7", onClick: () => inputDigit("7") },
    { label: "8", onClick: () => inputDigit("8") },
    { label: "9", onClick: () => inputDigit("9") },
    { label: "×", onClick: () => applyOperator("*"), variant: "light", color: "blue" },
    { label: "4", onClick: () => inputDigit("4") },
    { label: "5", onClick: () => inputDigit("5") },
    { label: "6", onClick: () => inputDigit("6") },
    { label: "−", onClick: () => applyOperator("-"), variant: "light", color: "blue" },
    { label: "1", onClick: () => inputDigit("1") },
    { label: "2", onClick: () => inputDigit("2") },
    { label: "3", onClick: () => inputDigit("3") },
    { label: "+", onClick: () => applyOperator("+"), variant: "light", color: "blue" },
    { label: "0", onClick: () => inputDigit("0"), span: 6 },
    { label: ".", onClick: inputDot },
    { label: "=", onClick: () => applyOperator(null), color: "blue" },
  ];

  return (
    <main>
      <Stack gap="md" align="center">
        <Title order={1}>Calculator</Title>
        <Paper withBorder shadow="sm" p="md" w={320}>
          <Stack gap="sm">
            <Paper withBorder p="sm" bg="var(--mantine-color-default-hover)">
              <Text
                ta="right"
                fz="xl"
                fw={600}
                style={{ minHeight: "1.5em", overflowWrap: "anywhere" }}
              >
                {display}
              </Text>
            </Paper>
            <Grid gap="xs">
              {keys.map((key, index) => (
                <Grid.Col key={index} span={key.span ?? 3}>
                  <Button
                    fullWidth
                    onClick={key.onClick}
                    variant={key.variant ?? "default"}
                    color={key.color}
                  >
                    {key.label}
                  </Button>
                </Grid.Col>
              ))}
            </Grid>
          </Stack>
        </Paper>
      </Stack>
    </main>
  );
}
