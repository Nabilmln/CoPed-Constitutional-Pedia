# 🔒 Security Guidelines - CoPed

## ⚠️ **CRITICAL SECURITY NOTICE**

This document outlines important security practices for the CoPed project.

## 🚨 **Immediate Actions Required**

### **1. Environment Variables Security**

#### **🔐 Sensitive Files**

- ❌ **NEVER** commit `.env` files to version control
- ✅ Always use `.env.example` for templates
- ✅ Keep actual credentials in local `.env` only

#### **📋 Required Environment Variables**

```bash
# MongoDB Atlas (Get from MongoDB dashboard)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Secret (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_32_character_minimum_secret

# Google Gemini API (Get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key
```

### **2. Code Security Practices**

#### **✅ Secure Implementation**

```python
# ✅ CORRECT: Use environment variables
import os
api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)
```

```python
# ❌ WRONG: Hardcoded API keys
genai.configure(api_key='AIzaSyDPVaD6JBzYf6fTzmPeR3eUck0Mm62LvHM')  # NEVER DO THIS!
```

#### **🔍 Files That Were Secured**

- ✅ `backend/gemini API/api_bridge.py` - Removed hardcoded API key
- ✅ `backend/gemini API/langchain_enhanced_rag.py` - Secured with environment variable
- ✅ `backend/gemini API/dataset_builder.py` - Implemented secure configuration
- ✅ `backend/.env` - Replaced with secure template

## 🛡️ **Security Checklist**

### **Development Environment**

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in actual credentials in `.env`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test application with environment variables
- [ ] Remove any hardcoded credentials from code

### **Production Environment**

- [ ] Use strong, unique passwords
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Use production-grade JWT secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up monitoring and logging
- [ ] Regular security audits

### **API Key Management**

- [ ] Generate unique API keys for each environment
- [ ] Monitor API usage for anomalies
- [ ] Rotate keys regularly (monthly recommended)
- [ ] Restrict API key permissions to minimum required
- [ ] Never share API keys in documentation or code

### **Database Security**

- [ ] Use strong MongoDB Atlas passwords
- [ ] Enable network access restrictions
- [ ] Set up database encryption at rest
- [ ] Regular backup verification
- [ ] Monitor database access logs

## 🚫 **What NOT to Commit**

### **Sensitive Files**

```
❌ .env
❌ .env.local
❌ .env.production
❌ config.json (with credentials)
❌ credentials.json
❌ Any file with API keys
❌ Private keys (.key, .pem files)
```

### **Sensitive Code Patterns**

```python
❌ api_key = "AIzaSyD..."
❌ password = "mypassword123"
❌ secret_key = "hardcoded_secret"
❌ mongodb_uri = "mongodb+srv://user:pass@..."
```

## 🔧 **Security Tools**

### **Pre-commit Hooks**

```bash
# Install git-secrets to prevent credential commits
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets && make install

# Configure for your repo
git secrets --register-aws
git secrets --install
```

### **Credential Scanning**

```bash
# Use truffleHog to scan for leaked credentials
docker run --rm -v "$PWD:/pwd" trufflesecurity/trufflehog:latest filesystem /pwd
```

## 📞 **Security Incident Response**

### **If Credentials Are Compromised**

1. **Immediate Actions:**

   - [ ] Revoke exposed API keys immediately
   - [ ] Change all passwords
   - [ ] Generate new JWT secrets
   - [ ] Review access logs

2. **Investigation:**

   - [ ] Identify scope of exposure
   - [ ] Check for unauthorized access
   - [ ] Document incident timeline

3. **Recovery:**
   - [ ] Generate new credentials
   - [ ] Update all affected systems
   - [ ] Test functionality
   - [ ] Monitor for suspicious activity

## 📧 **Contact**

For security concerns or to report vulnerabilities:

- **Email**: security@coped.indonesia.com
- **Encrypted Communication**: Use PGP key available on request

## 📚 **Additional Resources**

- [OWASP Security Guidelines](https://owasp.org/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security)

---

**🔒 Remember: Security is everyone's responsibility!**

_Last Updated: August 27, 2025_
