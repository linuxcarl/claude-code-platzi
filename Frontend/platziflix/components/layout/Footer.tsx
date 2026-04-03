export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)" }} className="py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
        <p style={{ color: "#e50914" }} className="font-bold text-lg mb-2">PLATZIFLIX</p>
        <p>Plataforma de cursos de tecnología online</p>
        <p className="mt-2">© {new Date().getFullYear()} Platziflix. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
