
TECHNICAL SPECIFICATION

Online Services Marketplace “Dastiyor”

1. General Information

Project Name: Dastiyor
Product Type: Online service marketplace (web platform)
Analogues: YouDo, Profi.ru
Goal: A platform where customers post service tasks and service providers (contractors) respond and complete them.

2. User Roles

	1.	Guest
	2.	Customer
	3.	Service Provider (Contractor)
	4.	Administrator

3. Functionality by Role

3.1 Guest

	•	View landing page
	•	Browse service categories
	•	View public tasks (without contact details)
	•	Sign up / Log in

3.2 Registration & Authentication

	•	Registration via phone number (SMS) or email
	•	Login with password
	•	Password recovery
	•	Phone number verification
	•	One account = one role (Customer or Service Provider)

3.3 Customer

Customer Dashboard

	•	Edit profile (name, photo, phone number)
	•	Task history
	•	Task statuses
	•	Chat with service providers
	•	Leave reviews for service providers

Task Creation

Fields:

	•	Task title
	•	Category
	•	Subcategory
	•	Description
	•	City / district
	•	Address (optional)
	•	Budget (fixed / negotiable)
	•	Date and time
	•	Urgency
	•	Photos / attachments

After publishing, the task:

	•	Appears in the public task feed
	•	Becomes available to service providers

Managing Responses

	•	View responses
	•	Select a service provider
	•	Reject responses
	•	Change task statuses:
	•	New
	•	In Progress
	•	Completed
	•	Cancelled

3.4 Service Provider (Contractor)

Service Provider Dashboard

	•	Profile:
	•	Full name
	•	Photo
	•	Description
	•	Skills
	•	Service categories
	•	Rating
	•	Reviews
	•	Completed tasks statistics
	•	Balance (if payments are enabled)

Task Feed

Filters:

	•	Category
	•	City / district
	•	Budget
	•	Urgency
	•	Date

4. Service Provider Subscriptions (Monetization)

Purpose

Service providers must have an active paid subscription to respond to tasks.

Subscription Logic

	•	Subscriptions apply only to service providers
	•	Customers use the platform for free
	•	Without an active subscription:
	•	Service providers cannot respond to tasks
	•	They can only browse the task feed

Subscription Plans (examples)

	•	Basic
	•	Duration: 7 days
	•	Limited responses per day
	•	Standard
	•	Duration: 30 days
	•	Unlimited responses
	•	Premium
	•	Duration: 30 days
	•	Unlimited responses
	•	Priority placement in task feed
	•	Highlighted provider profile

Subscription Features

	•	Start and end date
	•	Auto-expiration
	•	Statuses: Active / Expired / Cancelled
	•	Remaining days counter
	•	Response limit tracking

Payments

	•	Online payments (provider to be defined)
	•	Payment history for providers
	•	Admin can create, edit, disable plans
	•	Admin can manually activate subscriptions
	•	Free trial support

Access Control

Backend must validate subscription status before allowing:

	•	Task responses
	•	Access to customer contact details

5. Responding to a Task

	•	Comment
	•	Proposed price
	•	Estimated completion time

After selection:

	•	Chat becomes available
	•	Task hidden from other providers

6. Chat

	•	One-to-one chat (Customer ↔ Service Provider)
	•	Text messages
	•	Image sharing
	•	Message history
	•	Notifications

7. Reviews & Rating

	•	Customer leaves review after completion
	•	Rating: 1–5 stars
	•	Text comment
	•	Rating calculated automatically
	•	Reviews cannot be edited

8. Page Structure & Content Requirements

8.1 Landing Page (Home)

	•	Header (logo, navigation, login/signup)
	•	Hero section with value proposition
	•	CTA buttons:
	•	“Post a Task”
	•	“Become a Service Provider”
	•	How it works (Customer / Provider)
	•	Service categories
	•	Popular tasks preview
	•	Benefits section
	•	Footer (contacts, policies, social links)

8.2 Registration & Login Pages

	•	Role selection
	•	Phone / Email
	•	Password
	•	Verification
	•	Forgot password

8.3 Customer Dashboard Pages

	•	Profile settings
	•	My Tasks
	•	Messages
	•	Reviews
	•	Account settings

8.4 Task Creation Page

	•	Task form with all required fields
	•	Publish button
	•	Draft saving (optional)

8.5 Task Details Page

Customer view:

	•	Task details
	•	Responses list
	•	Provider selection
	•	Status management

Provider view:

	•	Task description
	•	Customer public profile
	•	“Respond” button (subscription required)

8.6 Service Provider Dashboard Pages

	•	Profile & verification
	•	Subscription status (active / expired)
	•	Task feed
	•	My responses
	•	Active tasks
	•	Completed tasks
	•	Reviews & rating
	•	Subscription & payment history

8.7 Task Feed Page (Provider)

	•	Task cards:
	•	Title
	•	Short description
	•	Budget
	•	Location
	•	Posted time
	•	Filters (category, location, budget, urgency)
	•	Highlighted tasks for Premium plans

8.8 Subscription Page

	•	Subscription plans
	•	Comparison table
	•	Purchase / renew buttons
	•	Payment methods
	•	Current subscription status

8.9 Chat Page

	•	Dialog list
	•	Message history
	•	Text input
	•	Image upload
	•	Notifications

8.10 Reviews Page

	•	Average rating
	•	Rating breakdown
	•	Reviews list

8.11 Admin Panel Pages

	•	Dashboard (analytics)
	•	Users management
	•	Tasks management
	•	Categories
	•	Subscriptions & payments
	•	Reviews & complaints
	•	Moderation tools

8.12 System Pages

	•	404
	•	Access denied
	•	Subscription expired
	•	Maintenance page

9. Notifications

	•	Email / SMS / Web push
	•	New tasks
	•	New responses
	•	Provider selected
	•	Chat messages
	•	Reviews
	•	Subscription events

10. Security

	•	Spam protection
	•	Rate limiting
	•	Data validation
	•	Action logging
	•	API protection

11. Technical Requirements

	•	Frontend: React / Next.js
	•	Backend: Node.js / Laravel / Django
	•	Database: PostgreSQL / MySQL
	•	File storage: S3-compatible cloud
	•	REST API
	•	Mobile-first responsive design

12. Languages

	•	Primary: Russian
	•	Tajik language support in future

13. Development Stages

	1.	UX/UI design
	2.	Backend & database
	3.	Frontend
	4.	Integration
	5.	Testing
	6.	Deployment
	7.	Maintenance

14. Final Deliverable

A fully production-ready, scalable online services marketplace “Dastiyor” with subscription-based monetization and clearly defined page structure.