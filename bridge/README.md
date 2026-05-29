# RonSuite Bridge — Power Mode

## Setup
cd bridge && npm install

## Start
From the project root: npm run bridge
In a separate terminal: ngrok http 3001

## Update bridge URL
Copy the ngrok HTTPS URL into RonSuite OS Settings > Bridge URL

## Notes
- Free ngrok URL changes on every restart — update Settings each time
- Paid ngrok ($8/mo) gives a fixed subdomain
- Bridge must be running for Power Mode and Obsidian sync to work
