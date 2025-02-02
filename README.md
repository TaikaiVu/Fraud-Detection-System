**Fraud Transaction Detection system**

A detection system system that evaluates financial transactions, analyzes fraudulent possibility, and provides actionable insights based on transaction patterns to mitigate financial risks.

Tech Stack:
1. React and Tailwind CSS - For a responsive and modern design.
2. AWS SageMaker - To train, deploy and invoke a custom machine learning model using XGBoost and Scikit-learn
3. AWS DynamoDB - For secure, encrypted storage of transaction data
4. AWS Lambda - To achieve automated transaction handling
5. AWS WebSocket API - For real-time data updates
6. AWS CloudFront - For fast, secure global content delivery.
7. Google Maps API - To provide the transaction location details


**Customer list and transaction risk level analysis:**
- Dashboard view that shows the list of mock customers data and transaction detail for each customer, with a risk level view for each transaction based on transaction amount, type of transaction, transaction location, analyzed through customized ML model.

![Screenshot 2025-01-31 at 09 44 07](https://github.com/user-attachments/assets/f8c5c7cc-75bd-4a75-b9c6-6ea80f1139bb)


**Customer Financial Profile Insights with ML model:**
- An analysis view for each available customers. Contains a graph that shows the visual changes of risk score over time based on every transaction made. It also contains an Insight view that give users a detail analysis of each customer's profile based on all the transaction trends of each specific customer.

![Screenshot 2025-01-31 at 09 45 49](https://github.com/user-attachments/assets/bc22f7a2-2c4e-49ad-aa7b-0c7b23ec0e4f)


**Risk Level Detail view:**
- For each flagged transaction, the user can see the detail of the transaction to furthur dig into the reason why the transaction was flagged. 

![Screenshot 2025-01-31 at 09 49 04](https://github.com/user-attachments/assets/1746b50e-4c7a-45b6-ada0-bbf274230bae)


**Mock transaction data insertion**
- Initially when a new transaction is made, the mock transaction data of a specific customer will have a default value for: "status": un-flagged, "riskLevel": normal, "reason": N/A and the AWS Lambda will handle the logic of updating these values based on analysis results made from model in AWS SageMaker

![Screenshot 2025-01-31 at 10 16 06](https://github.com/user-attachments/assets/20b608a7-e815-4c14-a628-1ebd699d421a)
