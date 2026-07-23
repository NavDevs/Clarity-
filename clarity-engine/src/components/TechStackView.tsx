import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { TechStackItem } from '../types';

interface TechStackViewProps {
  stackItems: TechStackItem[];
  onUpdateStackItem?: (itemId: string) => void;
}

const techDescriptions: Record<string, string> = {
  react: "React is a popular JavaScript library used for building user interfaces, particularly single-page applications. It breaks down complex UIs into small, reusable pieces called 'components'.\n\n### Key Interview Concepts:\n- **Virtual DOM**: React creates a lightweight copy of the actual DOM in memory. When state changes, it compares the virtual DOM with a snapshot (reconciliation) and only updates the parts that actually changed in the real DOM, making it highly performant.\n- **Hooks**: Functions like `useState` (for managing local component data) and `useEffect` (for side effects like fetching data or subscribing to events) that allow functional components to use state.\n- **Props & State**: 'Props' are read-only data passed down from parent to child components, while 'State' is mutable data managed within the component itself.",
  "react-dom": "React DOM is the glue between React and the browser's Document Object Model (DOM). While React defines the UI components, React DOM is responsible for actually rendering them to the webpage.\n\n### Key Interview Concepts:\n- **render() / createRoot()**: The primary methods used to mount a React application into a standard HTML element.\n- **Portals**: A way to render children into a DOM node that exists outside the DOM hierarchy of the parent component (useful for modals, tooltips, or popups without messing up CSS z-indexing).\n- **Hydration**: When using Server-Side Rendering, React DOM 'hydrates' the static HTML sent by the server, attaching event listeners to make the page interactive.",
  next: "Next.js is a powerful React framework that gives you building blocks to create fast, full-stack web applications. It handles complex configurations like routing, bundling, and rendering automatically.\n\n### Key Interview Concepts:\n- **Rendering Strategies**: Server-Side Rendering (SSR - generated per request), Static Site Generation (SSG - generated at build time), and Incremental Static Regeneration (ISR - updates static pages in the background).\n- **App Router vs Pages Router**: The newer App Router uses React Server Components by default, allowing components to run on the server to reduce JavaScript bundle sizes.\n- **File-based Routing**: The folder structure inside the `app` or `pages` directory automatically dictates the application's URLs.",
  tailwindcss: "Tailwind CSS is a 'utility-first' CSS framework. Instead of writing custom CSS classes, you style elements directly in your HTML by combining predefined small classes (like `bg-blue-500 text-white p-4`).\n\n### Key Interview Concepts:\n- **Utility-First vs Semantic CSS**: Utility classes map directly to CSS properties, preventing bloated, append-only CSS files and making it easy to know exactly what styles apply to an element.\n- **JIT (Just-In-Time) Compiler**: Tailwind watches your HTML files and generates only the CSS you actually use on-demand, resulting in incredibly small production CSS files.\n- **Responsive Design**: It uses mobile-first prefixes (e.g., `md:flex`, `lg:w-1/2`) to easily build responsive layouts without writing media queries.",
  "node.js": "Node.js is an open-source runtime environment that allows you to execute JavaScript code on the server, rather than just in a web browser. It is built on Google Chrome's fast V8 JavaScript engine.\n\n### Key Interview Concepts:\n- **Single-Threaded Event Loop**: Node.js runs on a single thread but handles thousands of concurrent connections efficiently. When an I/O operation occurs, Node delegates it to the OS and continues executing other code (asynchronous non-blocking I/O).\n- **CommonJS vs ESM**: Node traditionally used `require()` (CommonJS) but now fully supports modern `import/export` (ES Modules).\n- **Streams & Buffers**: Node can process massive amounts of data piece-by-piece (Streams) using temporary memory blocks (Buffers), making it great for large file processing.",
  express: "Express is the most popular, minimalist web framework for Node.js. It provides a simple layer of fundamental web application features without obscuring Node.js features.\n\n### Key Interview Concepts:\n- **Middleware**: The core concept of Express. Middleware are functions that have access to the request and response objects. They can execute code, modify the request, or end the request-response cycle.\n- **Routing**: Defining endpoints (URIs) and how they respond to client requests (GET, POST, PUT, DELETE).\n- **Error Handling**: Express has a special signature for error-handling middleware to catch and process failures gracefully.",
  typescript: "TypeScript is a superset of JavaScript developed by Microsoft. It adds static typing to the language, meaning you define the 'shapes' (types) of your data up-front, catching errors during development before the code even runs.\n\n### Key Interview Concepts:\n- **Interfaces vs Types**: Both describe object shapes, but Interfaces are better for object-oriented inheritance, while Types are better for unions or primitives.\n- **Generics**: A way to create reusable components that can work over a variety of types rather than a single one (e.g., `Array<T>`).\n- **Type Inference**: TypeScript is smart enough to figure out the type of a variable without you explicitly writing it.",
  mongodb: "MongoDB is a popular NoSQL database that stores data in flexible, JSON-like documents rather than rigid rows and columns like a traditional SQL database.\n\n### Key Interview Concepts:\n- **NoSQL vs SQL**: MongoDB doesn't enforce a strict schema, meaning documents in the same collection can have different fields. It's built for rapid development and horizontal scalability.\n- **The Document Model**: Data is stored in BSON. Related data can be embedded within a single document, reducing the need for expensive 'Joins'.\n- **Aggregation Pipeline**: A powerful framework for data aggregation, allowing you to process data records and return computed results.",
  postgresql: "PostgreSQL is an advanced, highly reliable, open-source object-relational database management system (RDBMS). It is known for its robust feature set and strict adherence to SQL standards.\n\n### Key Interview Concepts:\n- **ACID Compliance**: Atomicity, Consistency, Isolation, Durability. Postgres guarantees that database transactions are processed reliably.\n- **Indexes**: Data structures that improve the speed of data retrieval. Postgres supports many types, including B-tree, Hash, and GIN.\n- **MVCC (Multi-Version Concurrency Control)**: Postgres handles concurrent read/write operations by taking snapshots of data, ensuring readers don't block writers.",
  prisma: "Prisma is a modern, next-generation Object-Relational Mapper (ORM) for Node.js and TypeScript. It replaces traditional ORMs by offering a heavily type-safe database client.\n\n### Key Interview Concepts:\n- **The Prisma Schema**: A single declarative file where you define your data models and database connections. It acts as the ultimate source of truth.\n- **Type Safety**: Prisma auto-generates a custom TypeScript client based on your schema, catching errors at compile time if your code doesn't match the database.\n- **Migrations**: Prisma tracks changes to your schema file and automatically generates the exact SQL statements needed to update your database safely.",
  docker: "Docker is a tool that allows developers to package applications and all their dependencies into a standardized unit called a 'container'. This ensures the software runs exactly the same everywhere.\n\n### Key Interview Concepts:\n- **Images vs Containers**: An Image is a read-only template (the blueprint), while a Container is a running instance of that image.\n- **Volumes**: Containers are ephemeral (temporary). Volumes are used to persist data generated by containers, even if the container is destroyed.\n- **Dockerfile**: A text document containing all the commands a user could call on the command line to assemble an image.",
  redis: "Redis is an ultra-fast, open-source, in-memory data store. Because it keeps all data in RAM rather than on a slow hard drive, it is primarily used as a cache or a fast message broker.\n\n### Key Interview Concepts:\n- **Use Cases**: Session caching, full-page caches, leaderboards, and rate-limiting.\n- **Data Structures**: Unlike simple key-value stores, Redis supports Strings, Hashes, Lists, Sets, and Sorted Sets natively in memory.\n- **Persistence Options**: RDB takes point-in-time snapshots, while AOF logs every write operation. Often, both are used together for durability.",
  default: "This is a key dependency detected in the project's architecture.\n\n### Key Interview Concepts:\n- **Primary Use Case**: Understand exactly what problem this technology solves in the context of this specific repository.\n- **Trade-offs**: Be prepared to discuss why this technology might have been chosen over its popular alternatives.\n- **Integration**: Look at how this dependency interacts with the rest of the application's stack."
};

export const TechStackView: React.FC<TechStackViewProps> = ({
  stackItems,
  onUpdateStackItem
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const handleExpand = (id: string) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(existingId => existingId !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-16 relative z-0 text-[var(--color-foreground)] bg-[var(--color-background)]">
      {/* Header */}
      <header className="mb-16 border-b border-[var(--color-border)] pb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <span className="w-12 h-0.5 bg-[var(--color-accent)] block" />
            <span className="font-mono text-xs font-semibold text-[var(--color-accent)] uppercase tracking-[0.2em]">
              Tech Stack
            </span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-display font-bold text-[var(--color-foreground)] mb-6 tracking-tighter leading-[0.9]">
            Stack &<br />Blueprint.
          </h1>
          <p className="text-lg text-[var(--color-muted-foreground)] font-serif max-w-2xl leading-relaxed">
            Automated framework classification, version tracking, and insights across all loaded modules.
          </p>
        </div>
      </header>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-none overflow-hidden max-w-5xl mx-auto">
        <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-muted)] flex items-center justify-between text-[var(--color-foreground)]">
          <h2 className="font-display font-semibold text-xl tracking-wide flex items-center gap-4">
            <span className="material-symbols-outlined text-[24px]">layers</span>
            Detected Frameworks & Libraries
          </h2>
          <span className="font-mono text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-widest font-semibold">
            Updated via AST Scan
          </span>
        </div>

        <div className="flex flex-col">
          {stackItems.map((item) => {
            const isExpanded = expandedIds.includes(item.id);
            return (
              <div key={item.id} className="flex flex-col border-b border-[var(--color-border)] last:border-b-0 group">
                <div 
                  className={`p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[var(--color-input)] transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--color-input)]' : ''}`}
                  onClick={() => handleExpand(item.id)}
                >
                  <div className="flex items-center gap-6">
                    <div 
                      className="w-16 h-16 rounded-none border border-[var(--color-border)] flex items-center justify-center font-mono font-semibold text-2xl text-[var(--color-background)] shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-2xl text-[var(--color-foreground)] tracking-wide group-hover:text-[var(--color-accent)] transition-colors">{item.name}</h3>
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)] font-sans">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-start md:self-auto">
                    <span className="font-mono font-semibold text-[10px] px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] uppercase tracking-widest">
                      {item.category}
                    </span>
                    <span className={`material-symbols-outlined text-[var(--color-muted-foreground)] transition-transform duration-300 text-[24px] ${isExpanded ? 'rotate-180 text-[var(--color-accent)]' : 'group-hover:text-[var(--color-accent)]'}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Dropdown Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 lg:px-8 lg:py-8 bg-[var(--color-background)] border-t border-[var(--color-border)]">
                        <h4 className="font-mono text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">school</span>
                          Interview Brief
                        </h4>
                        <div className="text-sm font-sans leading-relaxed text-[var(--color-foreground)]/90 max-w-4xl">
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}) => <p className="mb-6 last:mb-0 leading-loose" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-[var(--color-foreground)]" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-4 marker:text-[var(--color-accent)]" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              h3: ({node, ...props}) => <h3 className="font-mono text-[11px] font-bold mb-4 mt-8 text-[var(--color-accent)] uppercase tracking-widest border-b border-[var(--color-border)] pb-2" {...props} />,
                              pre: ({node, ...props}) => (
                                <div className="bg-[#0A0A0B] border border-[var(--color-border)] p-4 font-mono text-xs overflow-x-auto my-4 rounded-none shadow-inner">
                                  <pre {...props} />
                                </div>
                              ),
                              code: ({node, className, children, ...props}: any) => (
                                <code className={`font-mono text-[11px] bg-[var(--color-card)] border border-[var(--color-border)] px-1 py-0.5 ${className || ''}`} {...props}>{children}</code>
                              )
                            }}
                          >
                            {techDescriptions[item.name.toLowerCase()] || techDescriptions.default}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
