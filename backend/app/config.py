"""Central configuration. Everything here is overridable via environment
variables (prefix DOCLISTENER_) so the app stays portable."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DOCLISTENER_", env_file=".env")

    # Where Voicebox's local server lives. This is the *only* engine coupling.
    voicebox_base_url: str = "http://127.0.0.1:17493"
    voicebox_timeout: float = 120.0  # local generation can be slow on some Macs

    # Local app data: SQLite db + cached audio clips.
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"

    # Cache audio as Opus via ffmpeg when available (huge disk savings).
    # Falls back to raw WAV from Voicebox if ffmpeg is not on PATH.
    prefer_opus: bool = True

    @property
    def db_path(self) -> Path:
        return self.data_dir / "doclistener.sqlite"

    @property
    def audio_dir(self) -> Path:
        return self.data_dir / "audio"

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    def ensure_dirs(self) -> None:
        for d in (self.data_dir, self.audio_dir, self.upload_dir):
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()
