SystemJS.config({
  transpiler: "plugin-typescript",
  packages: {
    "src": {
      "defaultExtension": "ts"
    }
  },
  meta: {
    "*.ts": {
      "loader": "plugin-typescript"
    },
    "*.tsx": {
      "loader": "plugin-typescript"
    }
  },
  typescriptOptions: {
    "typeCheck": true,
    "tsconfig": true
  }
});

SystemJS.config({
  packageConfigPaths: [
    "npm:@*/*.json",
    "npm:*.json",
    "github:*/*.json"
  ],
  map: {
    "bootstrap": "github:twbs/bootstrap@3.3.6",
    "css": "github:systemjs/plugin-css@0.1.20",
    "os": "github:jspm/nodelibs-os@0.2.0-alpha",
    "plugin-typescript": "github:frankwallis/plugin-typescript@4.0.5",
    "process": "github:jspm/nodelibs-process@0.2.0-alpha",
    "react": "npm:react@0.14.8",
    "react-dom": "npm:react-dom@0.14.8",
    "ts": "github:frankwallis/plugin-typescript@4.0.5",
    "typescript": "npm:typescript@1.9.0-dev.20160328"
  },
  packages: {
    "github:twbs/bootstrap@3.3.6": {
      "map": {
        "jquery": "github:components/jquery@2.2.1"
      }
    },
    "github:frankwallis/plugin-typescript@4.0.5": {
      "map": {
        "typescript": "npm:typescript@1.9.0-dev.20160328"
      }
    },
    "github:jspm/nodelibs-os@0.2.0-alpha": {
      "map": {
        "os-browserify": "npm:os-browserify@0.2.1"
      }
    },
    "npm:react@0.14.8": {
      "map": {
        "fbjs": "npm:fbjs@0.6.1"
      }
    }
  }
});
