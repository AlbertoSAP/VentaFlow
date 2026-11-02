import { sendNewVendorNotification } from "../../src/services/email";

const config = {
  serviceId: "service_x",
  templateId: "template_y",
  publicKey: "pk_z",
};

const vendor = {
  name: "Juan Pérez",
  email: "juan@x.com",
  created: 1791845068683,
};

describe("sendNewVendorNotification", () => {
  it("no envía sin configuración completa", async () => {
    const send = jest.fn(async () => {});
    await sendNewVendorNotification(vendor, {
      serviceId: "",
      templateId: "",
      publicKey: "",
    }, send);
    await sendNewVendorNotification(vendor, { ...config, publicKey: "" }, send);
    expect(send).not.toHaveBeenCalled();
  });

  it("envía con los datos del vendedor a la plantilla", async () => {
    const send = jest.fn(async () => {});
    await sendNewVendorNotification(vendor, config, send);
    expect(send).toHaveBeenCalledWith(
      "service_x",
      "template_y",
      {
        vendor_name: "Juan Pérez",
        vendor_email: "juan@x.com",
        vendor_date: expect.any(String),
      },
      "pk_z",
    );
  });

  it("no lanza si el envío falla", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const send = jest.fn(async () => {
      throw new Error("sin red");
    });
    await expect(
      sendNewVendorNotification(vendor, config, send),
    ).resolves.toBeUndefined();
  });
});
