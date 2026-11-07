using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace DummyGame
{
    internal static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string displayName = args.Length > 0 && !string.IsNullOrWhiteSpace(args[0])
                ? args[0]
                : "Game";

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            var form = new MedoGameWindow(displayName);
            Application.Run(form);
        }
    }

    internal sealed class MedoGameWindow : Form
    {
        private readonly string gameName;

        public MedoGameWindow(string name)
        {
            gameName = name;
            Text = gameName;
            Width = 560;
            Height = 280;
            MinimumSize = new Size(480, 240);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            BackColor = Color.FromArgb(10, 12, 34);
            ForeColor = Color.White;

            var iconPath = Path.Combine(AppContext.BaseDirectory, "DummyGame.ico");
            if (File.Exists(iconPath))
            {
                using var iconStream = File.OpenRead(iconPath);
                Icon = new Icon(iconStream);
            }

            var game = new Label
            {
                Text = gameName,
                Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleCenter,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 26f, FontStyle.Bold)
            };

            Controls.Add(game);
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            using var brush = new System.Drawing.Drawing2D.LinearGradientBrush(
                ClientRectangle,
                Color.FromArgb(13, 12, 42),
                Color.FromArgb(11, 40, 78),
                25f);
            e.Graphics.FillRectangle(brush, ClientRectangle);

            using var glow = new SolidBrush(Color.FromArgb(45, 168, 85, 247));
            e.Graphics.FillEllipse(glow, ClientSize.Width - 190, -100, 280, 220);
        }
    }
}
