import { PlopTypes } from "@turbo/gen";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator("ionic page", {
    description: "Adds a new ionic page",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the page?",
      },
      {
        type: "list",
        name: "folder",
        message: "Which folder would you like to put the component in?",
        choices: ["orderly", "base"],
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/shells/{{kebabCase folder}}/pages/{{kebabCase name}}-page.tsx",
        templateFile: "templates/ionic-page.hbs",
      },
      {
        type: "modify",
        path: "src/shells/{{kebabCase folder}}/content.ts",
        pattern: /^(.*\[)(.*)$/s,
        template:
          "import { {{pascalCase name}}PageContent } from './pages/{{kebabCase name}}-page';\n" +
          "$1\n" +
          "\t{{pascalCase name}}PageContent," +
          "$2",
      },
    ],
  });
}
