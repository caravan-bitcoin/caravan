import path from "path";

module.exports = function(plop) {
  plop.setGenerator("Create a new package", {
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Name of your new package?",
      },
      {
        type: "input",
        name: "author",
        message: "Author:",
        default: "unchained capital"
      },
      {
        type: "input",
        name: "description",
        message: "Description:",
      },
      {
        type: "confirm",
        name: "tsconfig",
        message: "Do you want a tsconfig.json?",
        default: true,
      },
      {
        type: "confirm",
        name: "tsupConfig",
        message: "Do you want a tsup.config.js?",
        default: true,
      },
      {
        type: "confirm",
        name: "jestConfig",
        message: "Do you want a jest.config.ts?",
        default: true,
      },
      {
        type: "confirm",
        name: "eslint",
        message: "Do you want a .eslintrc.js?",
        default: true,
      },
      {
        type: "confirm",
        name: "prettier",
        message: "Do you want a .prettierrc?",
        default: true,
      },
    ],
    actions: function(data) {
      const actions = [
        {
          type: "add",
          path: path.join(process.cwd(), `packages/${data.name}/package.json`),
          templateFile: path.join(
            process.cwd(),
            "turbo/generators/templates/package.json.hbs"
          ),
        },
        {
          type: "add",
          path: path.join(process.cwd(), `packages/${data.name}/README.md`),
          template: "# {{properCase name}}",
        },
        {
          type: "add",
          path: path.join(process.cwd(), `packages/${data.name}/src/index.ts`),
          template: "export {};",
        },
      ];

      if (data.tsconfig) {
        actions.push({
          type: "add",
          path: path.join(process.cwd(), `packages/${data.name}/tsconfig.json`),
          templateFile: path.join(
            process.cwd(),
            "turbo/generators/templates/tsconfig.json.hbs"
          ),
        });
      }

      if (data.tsupConfig) {
        actions.push({
          type: "add",
          path: path.join(
            process.cwd(),
            `packages/${data.name}/tsup.config.js`
          ),
          templateFile: path.join(
            process.cwd(),
            "turbo/generators/templates/tsup.config.js.hbs"
          ),
        });
      }

      if (data.jestConfig) {
        actions.push({
          type: "add",
          path: path.join(
            process.cwd(),
            `packages/${data.name}/jest.config.js`
          ),
          templateFile: path.join(
            process.cwd(),
            "turbo/generators/templates/jest.config.js.hbs"
          ),
        });
      }

      if (data.jenkinsfile) {
        actions.push({
          type: "add",
          path: path.join(process.cwd(), `packages/${data.name}/Jenkinsfile`),
          templateFile: path.join(
            process.cwd(),
            "turbo/generators/templates/Jenkinsfile.hbs"
          ),
        });
      }

      if (data.eslint) {
        actions.push({
          type: "add",
          path: path.join(process.cwd(), `packages/${data.name}/.eslintrc.js`),
          templateFile: path.join(
            process.cwd(),
            "turbo/generators/templates/.eslintrc.cjs.hbs"
          ),
        });
      }

      return actions;
    },
  });
};
