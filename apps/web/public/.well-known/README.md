# Apple Sign In — domain verification

When you configure the **Services ID** for Sign in with Apple in the Apple Developer
portal and add the domain `dastiyor.com`, Apple gives you a file named:

    apple-developer-domain-association.txt

Download it and drop it in **this** directory (`apps/web/public/.well-known/`).
Next.js will then serve it at:

    https://dastiyor.com/.well-known/apple-developer-domain-association.txt

Click **Verify** in the Apple portal once the file is live (after deploy).

Do not rename the file. It can stay committed to the repo.
