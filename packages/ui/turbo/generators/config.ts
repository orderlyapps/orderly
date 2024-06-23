import { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("react-component", {
    description: "Adds a new react component",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the component?",
      },
      {
        type: "list",
        name: "folder",
        message: "Which folder would you like to put the component in?",
        choices: ["ionic", "base"],
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/{{kebabCase folder}}/{{kebabCase name}}/{{pascalCase name}}.tsx",
        templateFile: "templates/component.hbs",
      },
      {
        type: "append",
        path: "src/index.ts",
        // pattern: /^/,
        template:
          'export { {{pascalCase name}} } from "./{{kebabCase folder}}/{{kebabCase name}}/{{pascalCase name}}";',
      },
    ],
  });
}
