# Salesforce Disaster Recovery

## References

- [OKR - Disaster Recovery for Salesforce](https://docs.google.com/document/d/1UFDM33Yhl0cgHcIDIfWIkq8V7ZiYNc32wy0SGdfmILo)

- [Design document for KR1](https://docs.google.com/document/d/1_KxFtfKU3-3-PSzaAYG90uONa05AVgoBmyBDyu5SC5c)

## Diagram

For context, this application is the implementation of the "Salesforce Disaster Recovery" system below.

![landscape diagram](./docs/landscape.svg 'Landscape Diagram')

## How to visualise diagrams in `vscode`

- Make sure you have Java 17 installed on your machine

- Install the [C4 DSL Extension](https://marketplace.visualstudio.com/items?itemName=systemticks.c4-dsl-extension) extension (ciarant.vscode-structurizr)

- Add the following lines to your workspace `settings.json` file:

  ```json
  "c4.diagram.plantuml.enabled": true
  "c4.diagram.structurizr.enabled": true
  ```

- Access the file `./docs/workspace.dsl` and click on "Show as PlantUML Diagram" above the view
