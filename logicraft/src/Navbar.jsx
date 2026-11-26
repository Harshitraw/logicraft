import './Navbar.css'

const navigationItems = [
	{ label: 'Home', href: '/' },
	{ label: 'Solutions', href: '#solutions' },
	{ label: 'Features', href: '#solutions' },
	{ label: 'Industries', href: '#solutions' },
	{ label: 'About Us', href: '#about-us' },
]

export default function Navbar() {
	return (
		<header className="site-header">
			<nav className="site-nav" aria-label="Main navigation">
				<a className="brand-mark" href="/" aria-label="LogiCraft home">
					LogiCraft
				</a>

				<div className="nav-links">
					{navigationItems.map((item) => (
						<a
								key={item.label}
								className={item.label === 'Home' ? 'nav-link-active' : ''}
								href={item.href}
								aria-current={item.label === 'Home' ? 'page' : undefined}
						>
								{item.label}
						</a>
					))}
				</div>

				<div className="nav-actions">
					<a className="nav-button nav-button-primary" href="#get-started">
						Get Started
					</a>
					<a className="nav-button nav-button-secondary" href="/dashboard">
						Login
					</a>
				</div>
			</nav>
		</header>
	)
}
