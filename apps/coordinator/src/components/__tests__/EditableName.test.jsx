import React from "react";
import { fireEvent, render, screen } from "../../utils/test-utils";

import EditableName from "../EditableName";

describe("EditableName", () => {
  const nameValue = "Value";

  const renderEditable = () => {
    const spy = vi.fn();
    const { getByDataCy, queryByDataCy } = render(
      <EditableName number={0} name={nameValue} setName={spy} />,
    );
    return {
      spy,
      getByDataCy,
      queryByDataCy,
      editButton: getByDataCy("edit-button"),
    };
  };

  const renderEditing = () => {
    const view = renderEditable();
    fireEvent.click(view.editButton);
    return {
      ...view,
      input: screen.getByDisplayValue(nameValue),
      saveButton: view.getByDataCy("save-button"),
      cancelButton: view.getByDataCy("cancel-button"),
    };
  };

  test("shows value and edit button", () => {
    const { editButton } = renderEditable();
    expect(screen.getByText(nameValue)).toBeVisible();
    expect(editButton).toBeVisible();
  });

  test("save and cancel buttons are not displayed", () => {
    const { queryByDataCy } = renderEditable();
    expect(queryByDataCy("save-button")).toBeNull();
    expect(queryByDataCy("save-button")).not.toBeInTheDocument();
    expect(queryByDataCy("cancel-button")).toBeNull();
    expect(queryByDataCy("cancel-button")).not.toBeInTheDocument();
  });

  describe("edit display", () => {
    test("edit button isn't visable", () => {
      const { queryByDataCy } = renderEditing();
      expect(queryByDataCy("edit-button")).toBeNull();
      expect(queryByDataCy("edit-button")).not.toBeInTheDocument();
    });

    test("contains input field and buttons", () => {
      const { input, saveButton, cancelButton } = renderEditing();
      expect(input).toBeVisible();
      expect(saveButton).toBeVisible();
      expect(cancelButton).toBeVisible();
    });

    test("the input field should have focus", () => {
      const { input } = renderEditing();
      expect(input).toHaveFocus();
    });

    test("name should not be able to be blank", () => {
      const { input } = renderEditing();
      fireEvent.change(input, { target: { value: "" } });
      expect(screen.getByText("Name cannot be blank.")).toBeVisible();
      expect(screen.getByText("Name", { selector: "label" })).toHaveClass(
        "Mui-error",
      );
    });

    describe("form interaction", () => {
      const updatedValue = "Updated Value";

      const renderUpdated = () => {
        const view = renderEditing();
        fireEvent.change(view.input, { target: { value: updatedValue } });
        return view;
      };

      test("clicking cancel restores prior value", () => {
        const { spy, getByDataCy, cancelButton } = renderUpdated();
        fireEvent.click(cancelButton);
        expect(spy).not.toBeCalled();
        expect(getByDataCy("editable-name-value")).toHaveTextContent(nameValue);
      });

      test("clicking save calls save callback", () => {
        const { spy, saveButton } = renderUpdated();
        fireEvent.click(saveButton);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(0, updatedValue);
      });
    });
  });
});
