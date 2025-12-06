# AI Search Visibility Platform - Implementation Plan

## Executive Summary

Build a platform that helps businesses track and optimize their visibility across AI-powered search engines (ChatGPT, Claude, Perplexity, Gemini, Grok, etc.). The platform will monitor how often brands/sites are mentioned or recommended in AI responses, analyze performance trends, and provide actionable insights for improving AI discoverability.

---

## 1. Core Problem & Value Proposition

### The Problem
- Traditional SEO focuses on Google rankings, but AI assistants increasingly influence purchase decisions
- Businesses have no visibility into whether AI models recommend their products/services
- No standardized way to measure or improve AI search presence

### Value Proposition
- **Visibility**: Track how often your brand appears in AI-generated responses
- **Benchmarking**: Compare performance against competitors
- **Optimization**: Actionable recommendations to improve AI discoverability
- **Trend Analysis**: Monitor changes over time as AI models update

---

## 2. Key Features (Based on Competitor Analysis)

### 2.1 Prompt Tracking & Monitoring

| Feature | Description | Priority |
|---------|-------------|----------|
| Custom Prompt Library | Users define search queries relevant to their business | P0 |
| Scheduled Prompt Runs | Daily/weekly automated queries to AI platforms | P0 |
| Multi-LLM Support | Query across ChatGPT, Claude, Perplexity, Gemini, Grok | P0 |
| Response Storage | Archive all AI responses for historical analysis | P0 |
| Real-time Alerts | Notify when brand mentions change significantly | P1 |

### 2.2 Analytics Dashboard

| Feature | Description | Priority |
|---------|-------------|----------|
| Visibility Score | Overall score (0-100) measuring AI presence | P0 |
| Mention Tracking | Count/frequency of brand mentions per AI platform | P0 |
| Position Tracking | Where your brand appears in responses (1st, 2nd, etc.) | P0 |
| Sentiment Analysis | Positive/negative/neutral tone of mentions | P1 |
| Trend Graphs | Historical performance visualization | P0 |
| Competitor Comparison | Side-by-side visibility analysis | P1 |

### 2.3 Content Audit & Optimization

| Feature | Description | Priority |
|---------|-------------|----------|
| Site Auditor | Analyze pages for AI-optimization factors | P1 |
| Content Scoring | Rate content on AI discoverability criteria | P1 |
| Recommendations | Specific suggestions to improve visibility | P1 |
| Schema Markup Analysis | Check structured data implementation | P2 |
| Citation Tracking | Monitor when AI links to your content | P1 |

### 2.4 Content Generation (Future Phase)

| Feature | Description | Priority |
|---------|-------------|----------|
| AI-Optimized Articles | Generate content designed for AI discovery | P2 |
| Brand Voice Training | Maintain consistency with existing content | P2 |
| Competitor Gap Analysis | Identify topics competitors rank for | P2 |

### 2.5 Reporting & Collaboration

| Feature | Description | Priority |
|---------|-------------|----------|
| Automated Reports | Weekly/monthly PDF summaries | P1 |
| Team Sharing | Multi-user access with roles | P1 |
| White-label Reports | Branded exports for agencies | P2 |
| API Access | Programmatic data retrieval | P2 |

---

## 3. AI Search Performance Evaluation Methodology

### 3.1 Metrics We Will Track

#### Primary Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISIBILITY SCORE (0-100)                      │
├─────────────────────────────────────────────────────────────────┤
│  Composite score based on:                                       │
│  • Mention Frequency (30%)                                       │
│  • Position/Prominence (25%)                                     │
│  • Citation Rate (20%)                                           │
│  • Sentiment (15%)                                               │
│  • Consistency Across LLMs (10%)                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Detailed Metrics

| Metric | How It's Calculated | Why It Matters |
|--------|---------------------|----------------|
| **Mention Rate** | (Prompts with brand mention / Total prompts) × 100 | Core visibility indicator |
| **Position Score** | Weighted score based on mention order (1st=100, 2nd=80, etc.) | Earlier mentions = stronger recommendation |
| **Citation Rate** | % of responses that link to your domain | Direct traffic potential |
| **Share of Voice** | Your mentions vs competitor mentions | Market positioning |
| **Sentiment Score** | NLP analysis of mention context (-1 to +1) | Quality of mentions |
| **Platform Coverage** | # of AI platforms mentioning you / Total platforms | Breadth of presence |
| **Response Inclusion Rate** | % of relevant queries that include you | Relevance measure |

### 3.2 Prompt Categories

Organize tracked prompts into categories for better analysis:

1. **Brand Queries** - Direct brand name searches
   - "What is [Brand]?"
   - "Tell me about [Brand]"

2. **Product/Service Queries** - Category searches
   - "Best [product category] in [location]"
   - "Top [service] providers"

3. **Comparison Queries** - Head-to-head evaluations
   - "[Brand] vs [Competitor]"
   - "Compare [Product A] and [Product B]"

4. **Recommendation Queries** - Purchase intent
   - "What [product] should I buy?"
   - "Recommend a [service] for [use case]"

5. **Problem/Solution Queries** - Pain point searches
   - "How do I solve [problem]?"
   - "Best way to [accomplish task]"

### 3.3 Evaluation Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Define     │───▶│   Execute    │───▶│   Analyze    │───▶│   Score &    │
│   Prompts    │    │   Queries    │    │   Responses  │    │   Report     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  • Industry        • API calls to      • NLP entity       • Calculate
    keywords          each LLM            extraction          metrics
  • Brand terms     • Rate limiting     • Sentiment         • Generate
  • Competitor      • Response            analysis            insights
    names             caching          • Link parsing       • Trend
  • Use cases       • Error handling   • Position            comparison
                                         detection
```

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Dashboard  │  │  Analytics  │  │   Reports   │  │  Settings   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  REST API / GraphQL  •  Authentication  •  Rate Limiting        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│   QUERY ENGINE       │ │  ANALYSIS ENGINE │ │    CONTENT ENGINE        │
│ ┌──────────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────────────┐ │
│ │ Scheduler        │ │ │ │ NLP Pipeline │ │ │ │ Site Crawler         │ │
│ │ LLM Connectors   │ │ │ │ Scoring      │ │ │ │ Content Analyzer     │ │
│ │ Response Cache   │ │ │ │ Trending     │ │ │ │ Recommendations      │ │
│ └──────────────────┘ │ │ └──────────────┘ │ │ └──────────────────────┘ │
└──────────────────────┘ └──────────────────┘ └──────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ PostgreSQL │  │   Redis    │  │ TimeSeries │  │   S3/Blob  │        │
│  │ (Primary)  │  │  (Cache)   │  │    DB      │  │  Storage   │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 LLM Integration Layer

```typescript
// Supported AI Platforms
interface LLMProvider {
  name: string;
  apiEndpoint: string;
  authMethod: 'api_key' | 'oauth';
  rateLimits: RateLimitConfig;
  responseParser: (raw: string) => ParsedResponse;
}

const SUPPORTED_PROVIDERS: LLMProvider[] = [
  { name: 'ChatGPT', /* OpenAI API */ },
  { name: 'Claude', /* Anthropic API */ },
  { name: 'Perplexity', /* Perplexity API */ },
  { name: 'Gemini', /* Google AI API */ },
  { name: 'Grok', /* xAI API */ },
  { name: 'DeepSeek', /* DeepSeek API */ },
  { name: 'Copilot', /* Microsoft API */ },
];
```

### 4.3 Database Schema (Core Tables)

```sql
-- Users & Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  plan_tier VARCHAR(50),
  created_at TIMESTAMP
);

CREATE TABLE domains (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  domain VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE
);

-- Prompt Tracking
CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  prompt_text TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE prompt_runs (
  id UUID PRIMARY KEY,
  prompt_id UUID REFERENCES prompts(id),
  llm_provider VARCHAR(50),
  executed_at TIMESTAMP,
  response_text TEXT,
  response_metadata JSONB
);

-- Analysis Results
CREATE TABLE mention_analysis (
  id UUID PRIMARY KEY,
  prompt_run_id UUID REFERENCES prompt_runs(id),
  domain_id UUID REFERENCES domains(id),
  mentioned BOOLEAN,
  position INTEGER,
  sentiment_score DECIMAL,
  citation_url TEXT,
  context_snippet TEXT
);

-- Aggregated Metrics (for fast dashboard queries)
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY,
  domain_id UUID REFERENCES domains(id),
  date DATE,
  llm_provider VARCHAR(50),
  visibility_score DECIMAL,
  mention_rate DECIMAL,
  avg_position DECIMAL,
  total_prompts INTEGER,
  total_mentions INTEGER
);
```

### 4.4 Technology Stack Recommendations

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js + React | SSR, great DX, easy deployment |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent design |
| **Charts** | Recharts or Tremor | Built for dashboards |
| **Backend** | Node.js (Hono/Express) or Python (FastAPI) | API flexibility |
| **Database** | PostgreSQL + TimescaleDB | Relational + time-series optimization |
| **Cache** | Redis | Session management, rate limiting |
| **Queue** | BullMQ or Celery | Background job processing |
| **Auth** | Clerk or Auth.js | Quick auth implementation |
| **Hosting** | Vercel + Railway/Render | Easy scaling |
| **Monitoring** | Sentry + Posthog | Error tracking + analytics |

---

## 5. Pricing Tiers (Based on Competitor Analysis)

### Recommended Structure

| Tier | Price/mo | Prompts | AI Answers/mo | Domains | LLMs Included |
|------|----------|---------|---------------|---------|---------------|
| **Starter** | $49 | 50 | 1,500 | 1 | ChatGPT only |
| **Pro** | $129 | 150 | 10,000 | 3 | ChatGPT, Perplexity, Claude |
| **Business** | $349 | 500 | 50,000 | 10 | All 5 major LLMs |
| **Enterprise** | Custom | Unlimited | Custom | Unlimited | All + Custom integrations |

### Feature Breakdown by Tier

```
                    Starter    Pro        Business   Enterprise
────────────────────────────────────────────────────────────────
Daily Runs            ✓         ✓           ✓           ✓
Visibility Score      ✓         ✓           ✓           ✓
Basic Dashboard       ✓         ✓           ✓           ✓
Competitor Tracking   -         3           10          Unlimited
Content Audits/mo     50        250         1000        Unlimited
Team Members          1         5           20          Unlimited
API Access            -         -           ✓           ✓
White-label           -         -           -           ✓
Custom Integrations   -         -           -           ✓
SLA                   -         -           99.5%       99.9%
Support               Email     Chat        Dedicated   Dedicated
```

---

## 6. Implementation Phases

### Phase 1: MVP (Weeks 1-6)
**Goal**: Core tracking and basic dashboard

- [ ] User authentication & organization setup
- [ ] Domain verification system
- [ ] Prompt management (CRUD)
- [ ] Integration with 2-3 LLMs (ChatGPT, Claude, Perplexity)
- [ ] Basic scheduling (daily runs)
- [ ] Response storage & basic parsing
- [ ] Simple dashboard with:
  - Visibility score
  - Mention count
  - Basic trend chart
- [ ] Stripe integration for billing

### Phase 2: Analytics Enhancement (Weeks 7-10)
**Goal**: Deep analytics and competitor features

- [ ] Add remaining LLM integrations (Gemini, Grok)
- [ ] Sentiment analysis pipeline
- [ ] Position tracking algorithm
- [ ] Competitor tracking setup
- [ ] Share of Voice calculations
- [ ] Enhanced dashboard visualizations
- [ ] Automated weekly email reports
- [ ] Alert system for significant changes

### Phase 3: Content Tools (Weeks 11-14)
**Goal**: Content audit and optimization recommendations

- [ ] Site crawler implementation
- [ ] Content scoring algorithm
- [ ] AI-optimization checklist
- [ ] Actionable recommendations engine
- [ ] Citation tracking
- [ ] Content gap analysis

### Phase 4: Scale & Polish (Weeks 15-18)
**Goal**: Enterprise features and optimization

- [ ] API for programmatic access
- [ ] White-label report generation
- [ ] Team collaboration features
- [ ] Advanced filtering and segmentation
- [ ] Performance optimization
- [ ] SOC 2 compliance preparation

---

## 7. Key Technical Challenges & Solutions

### Challenge 1: LLM Response Variability
**Problem**: AI responses vary significantly between runs
**Solution**:
- Run each prompt multiple times (3-5) and aggregate
- Use statistical methods to identify trends vs noise
- Store all raw responses for manual review

### Challenge 2: Rate Limiting & Costs
**Problem**: API costs and rate limits constrain queries
**Solution**:
- Implement intelligent scheduling (spread throughout day)
- Cache responses for duplicate prompts
- Tier-based allocation with overage charges
- Use cheaper models for validation runs

### Challenge 3: Entity Extraction Accuracy
**Problem**: Identifying brand mentions in unstructured text
**Solution**:
- Use NER (Named Entity Recognition) models
- Maintain brand name variations dictionary
- Fuzzy matching for typos/variations
- Human-in-the-loop validation for edge cases

### Challenge 4: Defining "Visibility"
**Problem**: No industry standard for AI visibility metrics
**Solution**:
- Develop proprietary scoring methodology
- Be transparent about calculation methods
- Allow users to weight factors based on their priorities
- Benchmark against industry studies

---

## 8. Competitive Differentiation Opportunities

| Opportunity | Description |
|-------------|-------------|
| **Vertical Focus** | Build industry-specific prompts (e.g., "Best restaurants in X" for hospitality) |
| **Local SEO** | Focus on location-based queries often ignored by competitors |
| **Multi-language** | Track visibility across non-English AI conversations |
| **Real-time** | Offer more frequent tracking (hourly vs daily) |
| **Open Methodology** | Publish how scores are calculated for trust |
| **Free Tier** | Generous free tier for virality |
| **Agency Tools** | White-label + client management for agencies |

---

## 9. Success Metrics for the Platform

### Business Metrics
- MRR growth rate
- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Churn rate
- Net Promoter Score (NPS)

### Product Metrics
- Daily/Weekly active users
- Prompts created per user
- Dashboard engagement time
- Feature adoption rates
- API usage

### Technical Metrics
- Query success rate (>99%)
- API latency (<500ms p95)
- System uptime (99.9%)
- Data freshness (queries within 24h)

---

## 10. Go-to-Market Considerations

### Target Customers
1. **SEO Agencies** - Offer as add-on service to clients
2. **E-commerce Brands** - Track product recommendations
3. **SaaS Companies** - Monitor brand presence in AI
4. **Local Businesses** - Track local recommendations
5. **Enterprise Marketing Teams** - Competitive intelligence

### Initial Acquisition Channels
- Free visibility report tool (lead magnet)
- Content marketing on AI SEO topics
- SEO community engagement (Twitter, Reddit, forums)
- Partnership with existing SEO tool providers
- Product Hunt launch

---

## Appendix A: Sample API Response Structure

```json
{
  "prompt_run": {
    "id": "run_abc123",
    "prompt": "What are the best project management tools?",
    "llm": "chatgpt-4",
    "executed_at": "2025-01-15T10:30:00Z",
    "response": {
      "raw_text": "Here are some of the best project management tools...",
      "mentions": [
        {
          "brand": "Asana",
          "position": 1,
          "sentiment": 0.85,
          "context": "Asana is excellent for team collaboration...",
          "citation_url": null
        },
        {
          "brand": "Monday.com",
          "position": 2,
          "sentiment": 0.72,
          "context": "Monday.com offers visual project tracking...",
          "citation_url": "https://monday.com"
        }
      ],
      "total_brands_mentioned": 5
    }
  }
}
```

---

## Appendix B: Visibility Score Calculation

```python
def calculate_visibility_score(domain_metrics: DomainMetrics) -> float:
    """
    Calculate composite visibility score (0-100)
    """
    weights = {
        'mention_rate': 0.30,
        'position_score': 0.25,
        'citation_rate': 0.20,
        'sentiment_score': 0.15,
        'platform_coverage': 0.10
    }

    # Normalize each metric to 0-100 scale
    mention_score = domain_metrics.mention_rate * 100
    position_score = calculate_position_score(domain_metrics.avg_position)
    citation_score = domain_metrics.citation_rate * 100
    sentiment_score = (domain_metrics.sentiment + 1) * 50  # Convert -1 to 1 → 0 to 100
    coverage_score = (domain_metrics.platforms_present / TOTAL_PLATFORMS) * 100

    # Weighted sum
    visibility_score = (
        mention_score * weights['mention_rate'] +
        position_score * weights['position_score'] +
        citation_score * weights['citation_rate'] +
        sentiment_score * weights['sentiment_score'] +
        coverage_score * weights['platform_coverage']
    )

    return round(visibility_score, 1)

def calculate_position_score(avg_position: float) -> float:
    """
    Convert average position to score (1st = 100, 5th+ = 20)
    """
    if avg_position <= 1:
        return 100
    elif avg_position <= 2:
        return 85
    elif avg_position <= 3:
        return 70
    elif avg_position <= 4:
        return 50
    else:
        return 20
```

---

## Next Steps

1. **Validate concept** - Build free visibility report tool as landing page
2. **Secure LLM API access** - Set up accounts with all target providers
3. **Design system** - Create UI/UX mockups for dashboard
4. **Start MVP development** - Begin Phase 1 implementation
5. **Beta users** - Recruit 10-20 beta testers from SEO community
