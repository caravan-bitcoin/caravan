{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.python311
    pkgs.hidapi
    pkgs.libusb1
  ];
  env = {
    PYTHONHOME = "${pkgs.python311Full}";
    PYTHONBIN = "${pkgs.python311Full}/bin/python3.11";
    LANG = "en_US.UTF-8";
  };
}