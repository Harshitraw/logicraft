import './Navbar.css'

const navigationItems = ['Home', 'Solutions', 'Features', 'Industries', 'About Us']

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
							key={item}
							className={item === 'Home' ? 'nav-link-active' : ''}
							href={`#${item.toLowerCase().replaceAll(' ', '-')}`}
							aria-current={item === 'Home' ? 'page' : undefined}
						>
							{item}
						</a>
					))}
				</div>

				<div className="nav-actions">
					<a className="nav-button nav-button-primary" href="#get-started">
						Get Started
					</a>
					<a className="nav-button nav-button-secondary" href="#login">
						Login
					</a>
				</div>
			</nav>
		</header>
	)
}
