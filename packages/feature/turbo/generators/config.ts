import { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("ionic modal", {
    description: "Adds a new ionic modal",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the modal?",
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/features/_/{{kebabCase name}}-modal.tsx",
        templateFile: "templates/ionic-modal.hbs",
      },
      {
        type: "append",
        path: "src/index.ts",
        // pattern: //,
        template: "export { {{pascalCase name}}Modal } from './features/_/{{kebabCase name}}-modal'",
      },
    ],
  });
}
