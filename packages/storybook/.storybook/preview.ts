import type { Preview } from "@storybook/react-vite";
import "./storybook.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "cpc-dark",
      values: [{ name: "cpc-dark", value: "#0a0a0a" }],
    },
  },
};

export { preview as default };
