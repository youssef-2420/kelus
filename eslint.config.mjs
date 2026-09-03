import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "out/**", ".cursor/**", ".impeccable/**"],
  },
];

export default eslintConfig;
