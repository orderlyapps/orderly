function iosPWASplash(icon: string, color = "white"): void {
  if (!("standalone" in navigator)) {
    return;
  }

  if (typeof icon !== "string" || icon.length === 0) {
    throw new Error("Invalid icon URL provided");
  }

  const screenWidth = screen.width;
  const screenHeight = screen.height;
  const pixelRatio = window.devicePixelRatio || 1;

  const portraitCanvas = document.createElement("canvas");
  const landscapeCanvas = document.createElement("canvas");
  const portraitCtx = portraitCanvas.getContext("2d");
  const landscapeCtx = landscapeCanvas.getContext("2d");

  if (!portraitCtx || !landscapeCtx) {
    return;
  }

  const iconImage = new Image();
  iconImage.onerror = () => {
    console.error("Failed to load icon image");
  };
  iconImage.onload = () => {
    portraitCanvas.width = screenWidth * pixelRatio;
    landscapeCanvas.height = portraitCanvas.width;
    portraitCanvas.height = screenHeight * pixelRatio;
    landscapeCanvas.width = portraitCanvas.height;

    const iconWidth = portraitCanvas.width / 3;
    const iconHeight = iconWidth * (iconImage.height / iconImage.width);

    portraitCtx.fillStyle = color;
    landscapeCtx.fillStyle = color;
    portraitCtx.fillRect(0, 0, portraitCanvas.width, portraitCanvas.height);
    landscapeCtx.fillRect(0, 0, landscapeCanvas.width, landscapeCanvas.height);

    const portraitX = (portraitCanvas.width - iconWidth) / 2;
    const portraitY = (portraitCanvas.height - iconHeight) / 2;
    const landscapeX = (landscapeCanvas.width - iconWidth) / 2;
    const landscapeY = (landscapeCanvas.height - iconHeight) / 2;

    portraitCtx.drawImage(iconImage, portraitX, portraitY, iconWidth, iconHeight);
    landscapeCtx.drawImage(iconImage, landscapeX, landscapeY, iconWidth, iconHeight);

    const portraitDataUrl = portraitCanvas.toDataURL("image/png");
    const landscapeDataUrl = landscapeCanvas.toDataURL("image/png");

    const portraitLink = document.createElement("link");
    portraitLink.setAttribute("rel", "apple-touch-startup-image");
    portraitLink.setAttribute("media", "screen and (orientation: portrait)");
    portraitLink.setAttribute("href", portraitDataUrl);
    document.head.appendChild(portraitLink);

    const landscapeLink = document.createElement("link");
    landscapeLink.setAttribute("rel", "apple-touch-startup-image");
    landscapeLink.setAttribute("media", "screen and (orientation: landscape)");
    landscapeLink.setAttribute("href", landscapeDataUrl);
    document.head.appendChild(landscapeLink);
  };
  iconImage.src = icon;
}

iosPWASplash("/apple-touch-icon.png", "#3880ff");
