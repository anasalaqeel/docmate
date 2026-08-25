# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary**: Developers integrating APIs - software engineers who need API documentation to integrate services into their applications.

**Secondary**: Internal teams creating docs - teams within organizations who need to create and maintain both API documentation and traditional docs.

## Product Purpose

Grud is a self-hosted documentation platform that unifies traditional guides and interactive API documentation in a single interface. Success means teams can maintain comprehensive documentation without tool fragmentation, while developers get seamless integration guidance.

## Positioning

The only platform that combines traditional documentation (guides, tutorials) with interactive API testing in one self-hosted solution. Unlike Swagger UI (API-only), GitBook (traditional-only), or SaaS platforms (hosted), Grud serves both content types with full data control.

## Operating Context

- **Creation workflow**: Admin teams use the admin panel to organize content hierarchically, import OpenAPI specs, and configure visibility
- **Consumption workflow**: Developers browse documentation, test API endpoints interactively, and integrate services
- **Deployment patterns**: Self-hosted via Docker, configurable ports and database connections
- **Security context**: Enterprise environments requiring RBAC, secure file uploads, and audit trails

## Capabilities and Constraints

**Confirmed functionality**:
- Multi-type documentation projects (traditional, API, mixed)
- Hierarchical sidebar with folders, pages, and dividers
- OpenAPI specification import and display
- Interactive API endpoint testing
- Public/private visibility toggles per documentation
- Role-based access control (admin, superadmin, moderator)
- Dynamic theming (light/dark mode, custom colors, typography)
- Version tagging for documentation projects
- External ingestion API for automated spec updates

**Technical constraints**:
- Self-hosted deployment (Docker Compose recommended)
- PostgreSQL database (v14+)
- JWT-based authentication
- Bun.js backend with Hono framework
- React 19 frontend with Vite and Tailwind CSS 4

**Terminology**:
- "Documentation project" - a collection of related docs with shared theming
- "Sidebar items" - hierarchical content organization (folders, pages, dividers)
- "API endpoints" - interactive API documentation sections

## Brand Commitments

**User explicitly stated**: "No brand constraints, feel free to pic proper colors or branding system docmate"

Complete visual rebrand is requested. The purple/blue gradient theme is being replaced with a distinctive, professional identity suitable for developer tools.

## Evidence on Hand

- Real product name: "Grud" (pending rebrand consideration)
- Comprehensive feature set documented in README.md
- Working codebase with admin and public documentation surfaces
- Authentication system with role management
- OpenAPI integration capabilities

**Absences**: No established brand guidelines, no current marketing materials, no user testimonials or case studies.

## Product Principles

1. **Unified experience**: Documentation creators and consumers work in the same ecosystem without tool switching
2. **Developer productivity**: Interactive API testing alongside conceptual documentation reduces context switching
3. **Organizational control**: Self-hosted deployment with RBAC meets enterprise security and compliance requirements
4. **Flexibility**: Support for multiple documentation types and theming options serves diverse team needs
5. **Integration-friendly**: External ingestion API enables CI/CD pipelines and automated documentation updates

## Accessibility & Inclusion

No specific accessibility requirements established. Will follow WCAG AA standards as baseline for developer tools.